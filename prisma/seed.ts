// prisma/seed.ts
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { LIBRARY_SCALES } from '../lib/seed-scales'
import { hashPassword } from '../lib/password'
import { buildAnonymousId } from '../lib/anonymous-id'

const prisma = new PrismaClient()

/// Shared across every seeded account. Override with SEED_PASSWORD locally.
/// These credentials are for development fixtures only — the practice they
/// belong to is not a real clinic and the patients are not real people.
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'ApasDev!2026'

async function main() {
  console.log('Seeding library scales...')

  for (const scaleDef of LIBRARY_SCALES) {
    const existing = await prisma.scale.findFirst({
      where: { name: scaleDef.name, isLibrary: true },
    })

    if (existing) {
      // Update content in-place: wipe items + thresholds (cascade deletes options)
      // then recreate them. The Scale row itself stays so existing sessions keep
      // their FK reference.
      await prisma.$transaction([
        prisma.scaleItem.deleteMany({ where: { scaleId: existing.id } }),
        prisma.severityThreshold.deleteMany({ where: { scaleId: existing.id } }),
        prisma.scale.update({
          where: { id: existing.id },
          data: { description: scaleDef.description },
        }),
      ])

      for (const item of scaleDef.items) {
        await prisma.scaleItem.create({
          data: {
            scaleId: existing.id,
            order: item.order,
            text: item.text,
            type: item.type as any,
            required: true,
            options: { create: item.options.map(o => ({ label: o.label, value: o.value, order: o.order })) },
          },
        })
      }
      await prisma.severityThreshold.createMany({
        data: scaleDef.thresholds.map(t => ({ ...t, scaleId: existing.id })),
      })
      console.log(`  Updated ${scaleDef.name}`)
      continue
    }

    await prisma.scale.create({
      data: {
        name: scaleDef.name,
        description: scaleDef.description,
        isLibrary: true,
        psychologistId: null,
        items: {
          create: scaleDef.items.map(item => ({
            order: item.order,
            text: item.text,
            type: item.type as any,
            required: true,
            options: {
              create: item.options.map(opt => ({
                label: opt.label,
                value: opt.value,
                order: opt.order,
              })),
            },
          })),
        },
        thresholds: {
          create: scaleDef.thresholds,
        },
      },
    })
    console.log(`  Seeded ${scaleDef.name}`)
  }

  await seedPractice()
  await seedSecondPractice()

  console.log('Done.')
}

/**
 * A development practice with staff, areas and a small caseload.
 *
 * Library scales above stay global — practiceId null, isLibrary true — so they
 * are available to every practice. Everything created here is practice-owned.
 */
async function seedPractice() {
  console.log('\nSeeding development practice...')

  const passwordHash = await hashPassword(SEED_PASSWORD)

  const practice = await prisma.practice.upsert({
    where: { slug: 'renaissance' },
    update: {},
    create: {
      name: 'Renaissance Psychological Services',
      slug: 'renaissance',
      // Seeded practices skip the verification gate so the app is usable
      // immediately; a real signup starts at PENDING_VERIFICATION.
      status: 'ACTIVE',
      registrationNumber: 'DEV-0000',
      contactEmail: 'hello@renaissance.test',
      city: 'Lagos',
      country: 'Nigeria',
    },
  })

  const areaDefs = [
    { name: 'Cognitive Psychology', specialty: 'COGNITIVE' as const },
    { name: 'Forensic Psychology', specialty: 'FORENSIC' as const },
    { name: 'Developmental Psychology', specialty: 'DEVELOPMENTAL' as const },
  ]

  const areas = []
  for (const def of areaDefs) {
    areas.push(
      await prisma.area.upsert({
        where: { practiceId_name: { practiceId: practice.id, name: def.name } },
        update: {},
        create: { practiceId: practice.id, name: def.name, specialty: def.specialty },
      }),
    )
  }
  console.log(`  Practice ${practice.name} with ${areas.length} areas`)

  const staffDefs = [
    { email: 'owner@apas.test', name: 'Dr. Ada Okonkwo', role: 'OWNER' as const, areaIndex: 0 },
    { email: 'clinician@apas.test', name: 'Dr. Ben Adeyemi', role: 'CLINICIAN' as const, areaIndex: 1 },
    // Front desk exists in the fixture specifically so the permission boundary
    // that hides notes and scores has something to be tested against.
    { email: 'frontdesk@apas.test', name: 'Chi Nwosu', role: 'FRONT_DESK' as const, areaIndex: 0 },
  ]

  const staff = []
  for (const def of staffDefs) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email,
        name: def.name,
        passwordHash,
        emailVerified: new Date(),
      },
    })

    const membership = await prisma.membership.upsert({
      where: { userId_practiceId: { userId: user.id, practiceId: practice.id } },
      update: {},
      create: {
        userId: user.id,
        practiceId: practice.id,
        role: def.role,
        status: 'ACTIVE',
        licenceNumber: `LIC-${def.role}-001`,
      },
    })

    await prisma.membershipArea.upsert({
      where: {
        membershipId_areaId: { membershipId: membership.id, areaId: areas[def.areaIndex].id },
      },
      update: {},
      create: { membershipId: membership.id, areaId: areas[def.areaIndex].id },
    })

    staff.push({ user, membership, role: def.role })
    console.log(`  ${def.role.padEnd(11)} ${def.email}`)
  }

  const owner = staff[0].user
  const clinician = staff[1].user

  const existingPatients = await prisma.patient.count({ where: { practiceId: practice.id } })
  if (existingPatients > 0) {
    console.log(`  ${existingPatients} patients already present — skipping caseload`)
    return
  }

  const patientDefs = [
    { displayName: 'A. Bello', clinicianId: owner.id, areaIndex: 0 },
    { displayName: 'K. Mensah', clinicianId: owner.id, areaIndex: 0 },
    { displayName: 'T. Eze', clinicianId: clinician.id, areaIndex: 1 },
  ]

  const phq9 = await prisma.scale.findFirst({ where: { name: 'PHQ-9', isLibrary: true } })
  const gad7 = await prisma.scale.findFirst({ where: { name: 'GAD-7', isLibrary: true } })

  for (const [index, def] of patientDefs.entries()) {
    const patient = await prisma.patient.create({
      data: {
        practiceId: practice.id,
        psychologistId: def.clinicianId,
        displayName: def.displayName,
        // Anonymous ids are unique per practice, not per clinician — see the
        // @@unique on Patient.
        anonymousId: buildAnonymousId(index + 1),
        areas: { create: { areaId: areas[def.areaIndex].id } },
      },
    })

    const session = await prisma.clinicalSession.create({
      data: {
        practiceId: practice.id,
        patientId: patient.id,
        psychologistId: def.clinicianId,
        kind: 'APPOINTMENT',
        title: 'Initial assessment',
        reason: 'Baseline screening',
        scheduledAt: new Date(),
        token: randomUUID(),
        tokenExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    })

    for (const [order, scale] of [phq9, gad7].filter(Boolean).entries()) {
      await prisma.questionnaire.create({
        data: {
          practiceId: practice.id,
          sessionId: session.id,
          scaleId: scale!.id,
          order: order + 1,
        },
      })
    }

    console.log(`  Patient ${patient.anonymousId} (${def.displayName})`)
  }

  await prisma.note.create({
    data: {
      practiceId: practice.id,
      authorId: owner.id,
      patientId: (await prisma.patient.findFirstOrThrow({ where: { practiceId: practice.id } })).id,
      body: 'Baseline screening sent. Review on return.',
    },
  })

  console.log(`\n  Sign in with any of the accounts above — password: ${SEED_PASSWORD}`)
}

/**
 * A second practice where the Renaissance owner is only a Clinician.
 *
 * Phase 6 verification: the same human holds different roles in two practices
 * and the switcher + role gates behave correctly in both.
 */
async function seedSecondPractice() {
  console.log('\nSeeding second development practice...')

  const passwordHash = await hashPassword(SEED_PASSWORD)

  const practice = await prisma.practice.upsert({
    where: { slug: 'harbor' },
    update: {},
    create: {
      name: 'Harbor Clinical Centre',
      slug: 'harbor',
      status: 'ACTIVE',
      registrationNumber: 'DEV-0001',
      contactEmail: 'hello@harbor.test',
      city: 'Abuja',
      country: 'Nigeria',
    },
  })

  const area = await prisma.area.upsert({
    where: { practiceId_name: { practiceId: practice.id, name: 'Clinical' } },
    update: {},
    create: {
      practiceId: practice.id,
      name: 'Clinical',
      specialty: 'CLINICAL',
    },
  })

  const harborOwner = await prisma.user.upsert({
    where: { email: 'harbor.owner@apas.test' },
    update: {},
    create: {
      email: 'harbor.owner@apas.test',
      name: 'Dr. Funke Balogun',
      passwordHash,
      emailVerified: new Date(),
    },
  })

  const renaissanceOwner = await prisma.user.findUnique({
    where: { email: 'owner@apas.test' },
  })
  if (!renaissanceOwner) {
    console.log('  Skipping — Renaissance owner not found')
    return
  }

  for (const def of [
    { user: harborOwner, role: 'OWNER' as const },
    { user: renaissanceOwner, role: 'CLINICIAN' as const },
  ]) {
    const membership = await prisma.membership.upsert({
      where: {
        userId_practiceId: {
          userId: def.user.id,
          practiceId: practice.id,
        },
      },
      update: { role: def.role, status: 'ACTIVE' },
      create: {
        userId: def.user.id,
        practiceId: practice.id,
        role: def.role,
        status: 'ACTIVE',
      },
    })

    await prisma.membershipArea.upsert({
      where: {
        membershipId_areaId: {
          membershipId: membership.id,
          areaId: area.id,
        },
      },
      update: {},
      create: { membershipId: membership.id, areaId: area.id },
    })

    console.log(`  ${def.role.padEnd(11)} ${def.user.email}`)
  }

  console.log(
    `  ${renaissanceOwner.email} is OWNER at renaissance and CLINICIAN at harbor`,
  )
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
