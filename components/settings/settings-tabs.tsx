"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form"
import { PasswordSettingsForm } from "@/components/settings/password-settings-form"
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form"

interface SettingsTabsProps {
  initialName: string
  email: string
}

export function SettingsTabs({ initialName, email }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full gap-6">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-fit">
        <TabsTrigger value="profile" className="flex-1 sm:flex-none">
          Profile
        </TabsTrigger>
        <TabsTrigger value="password" className="flex-1 sm:flex-none">
          Password
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex-1 sm:flex-none">
          Notifications
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileSettingsForm initialName={initialName} email={email} />
      </TabsContent>

      <TabsContent value="password">
        <PasswordSettingsForm />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationPreferencesForm />
      </TabsContent>
    </Tabs>
  )
}
