// lib/seed-scales.ts

const FREQUENCY_OPTIONS = [
  { label: 'Not at all', value: 0, order: 0 },
  { label: 'Several days', value: 1, order: 1 },
  { label: 'More than half the days', value: 2, order: 2 },
  { label: 'Nearly every day', value: 3, order: 3 },
]

const PCL5_OPTIONS = [
  { label: 'Not at all', value: 0, order: 0 },
  { label: 'A little bit', value: 1, order: 1 },
  { label: 'Moderately', value: 2, order: 2 },
  { label: 'Quite a bit', value: 3, order: 3 },
  { label: 'Extremely', value: 4, order: 4 },
]

export const LIBRARY_SCALES = [
  {
    name: 'PHQ-9',
    description: 'Patient Health Questionnaire — 9-item depression screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'Little interest or pleasure in doing things', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 2, text: 'Feeling down, depressed, or hopeless', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 3, text: 'Trouble falling or staying asleep, or sleeping too much', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 4, text: 'Feeling tired or having little energy', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 5, text: 'Poor appetite or overeating', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 6, text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 8, text: 'Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself in some way', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
    ],
    thresholds: [
      { label: 'None–Minimal', minScore: 0, maxScore: 4 },
      { label: 'Mild', minScore: 5, maxScore: 9 },
      { label: 'Moderate', minScore: 10, maxScore: 14 },
      { label: 'Moderately Severe', minScore: 15, maxScore: 19 },
      { label: 'Severe', minScore: 20, maxScore: 27 },
    ],
  },
  {
    name: 'GAD-7',
    description: 'Generalised Anxiety Disorder — 7-item anxiety screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'Feeling nervous, anxious, or on edge', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 2, text: 'Not being able to stop or control worrying', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 3, text: 'Worrying too much about different things', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 4, text: 'Trouble relaxing', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 5, text: 'Being so restless that it is hard to sit still', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 6, text: 'Becoming easily annoyed or irritable', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 7, text: 'Feeling afraid as if something awful might happen', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
    ],
    thresholds: [
      { label: 'Minimal', minScore: 0, maxScore: 4 },
      { label: 'Mild', minScore: 5, maxScore: 9 },
      { label: 'Moderate', minScore: 10, maxScore: 14 },
      { label: 'Severe', minScore: 15, maxScore: 21 },
    ],
  },
  {
    name: 'BDI-II',
    description:
      '21-item depression assessment.\n\nOver the past two weeks, please select the statement that best describes how you have been feeling.',
    isLibrary: true,
    items: [
      {
        order: 1, text: 'Sadness', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I do not feel sad', value: 0, order: 0 },
          { label: '1 — I feel sad much of the time', value: 1, order: 1 },
          { label: '2 — I am sad all the time', value: 2, order: 2 },
          { label: '3 — I am so sad or unhappy that I cannot stand it', value: 3, order: 3 },
        ],
      },
      {
        order: 2, text: 'Pessimism', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I am not discouraged about my future', value: 0, order: 0 },
          { label: '1 — I feel more discouraged about my future than I used to be', value: 1, order: 1 },
          { label: '2 — I do not expect things to work out for me', value: 2, order: 2 },
          { label: '3 — I feel my future is hopeless and will only get worse', value: 3, order: 3 },
        ],
      },
      {
        order: 3, text: 'Past Failure', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I do not feel like a failure', value: 0, order: 0 },
          { label: '1 — I have failed more than I should have', value: 1, order: 1 },
          { label: '2 — As I look back, I see a lot of failures', value: 2, order: 2 },
          { label: '3 — I feel I am a total failure as a person', value: 3, order: 3 },
        ],
      },
      {
        order: 4, text: 'Loss of Pleasure', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I get as much pleasure as ever from the things I enjoy', value: 0, order: 0 },
          { label: "1 — I don't enjoy things as much as I used to", value: 1, order: 1 },
          { label: '2 — I get very little pleasure from the things I used to enjoy', value: 2, order: 2 },
          { label: "3 — I can't get any pleasure from the things I used to enjoy", value: 3, order: 3 },
        ],
      },
      {
        order: 5, text: 'Guilty Feelings', type: 'MULTIPLE_CHOICE',
        options: [
          { label: "0 — I don't feel particularly guilty", value: 0, order: 0 },
          { label: '1 — I feel guilty over many things I have done or should have done', value: 1, order: 1 },
          { label: '2 — I feel quite guilty most of the time', value: 2, order: 2 },
          { label: '3 — I feel guilty all of the time', value: 3, order: 3 },
        ],
      },
      {
        order: 6, text: 'Punishment Feelings', type: 'MULTIPLE_CHOICE',
        options: [
          { label: "0 — I don't feel I am being punished", value: 0, order: 0 },
          { label: '1 — I feel I may be punished', value: 1, order: 1 },
          { label: '2 — I expect to be punished', value: 2, order: 2 },
          { label: '3 — I feel I am being punished', value: 3, order: 3 },
        ],
      },
      {
        order: 7, text: 'Self-Dislike', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I feel the same about myself as ever', value: 0, order: 0 },
          { label: '1 — I have lost confidence in myself', value: 1, order: 1 },
          { label: '2 — I am disappointed in myself', value: 2, order: 2 },
          { label: '3 — I dislike myself', value: 3, order: 3 },
        ],
      },
      {
        order: 8, text: 'Self-Criticalness', type: 'MULTIPLE_CHOICE',
        options: [
          { label: "0 — I don't criticise or blame myself more than usual", value: 0, order: 0 },
          { label: '1 — I am more critical of myself than I used to be', value: 1, order: 1 },
          { label: '2 — I criticise myself for all of my faults', value: 2, order: 2 },
          { label: '3 — I blame myself for everything bad that happens', value: 3, order: 3 },
        ],
      },
      {
        order: 9, text: 'Suicidal Thoughts or Wishes', type: 'MULTIPLE_CHOICE',
        options: [
          { label: "0 — I don't have any thoughts of killing myself", value: 0, order: 0 },
          { label: '1 — I have thoughts of killing myself, but I would not carry them out', value: 1, order: 1 },
          { label: '2 — I would like to kill myself', value: 2, order: 2 },
          { label: '3 — I would kill myself if I had the chance', value: 3, order: 3 },
        ],
      },
      {
        order: 10, text: 'Crying', type: 'MULTIPLE_CHOICE',
        options: [
          { label: "0 — I don't cry any more than I used to", value: 0, order: 0 },
          { label: '1 — I cry more than I used to', value: 1, order: 1 },
          { label: '2 — I cry over every little thing', value: 2, order: 2 },
          { label: "3 — I feel like crying but I can't", value: 3, order: 3 },
        ],
      },
      {
        order: 11, text: 'Agitation', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I am no more restless or wound up than usual', value: 0, order: 0 },
          { label: '1 — I feel more restless or wound up than usual', value: 1, order: 1 },
          { label: "2 — I am so restless or agitated that it's hard to stay still", value: 2, order: 2 },
          { label: '3 — I am so restless or agitated that I have to keep moving or doing something', value: 3, order: 3 },
        ],
      },
      {
        order: 12, text: 'Loss of Interest', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I have not lost interest in other people or activities', value: 0, order: 0 },
          { label: '1 — I am less interested in other people or things than before', value: 1, order: 1 },
          { label: '2 — I have lost most of my interest in other people or things', value: 2, order: 2 },
          { label: "3 — It's hard to get interested in anything", value: 3, order: 3 },
        ],
      },
      {
        order: 13, text: 'Indecisiveness', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I make decisions about as well as ever', value: 0, order: 0 },
          { label: '1 — I find it more difficult to make decisions than usual', value: 1, order: 1 },
          { label: '2 — I have much greater difficulty making decisions than I used to', value: 2, order: 2 },
          { label: '3 — I have trouble making any decisions', value: 3, order: 3 },
        ],
      },
      {
        order: 14, text: 'Worthlessness', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I do not feel I am worthless', value: 0, order: 0 },
          { label: "1 — I don't consider myself as worthwhile and useful as I used to", value: 1, order: 1 },
          { label: '2 — I feel more worthless compared to other people', value: 2, order: 2 },
          { label: '3 — I feel utterly worthless', value: 3, order: 3 },
        ],
      },
      {
        order: 15, text: 'Loss of Energy', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I have as much energy as ever', value: 0, order: 0 },
          { label: '1 — I have less energy than I used to have', value: 1, order: 1 },
          { label: "2 — I don't have enough energy to do very much", value: 2, order: 2 },
          { label: "3 — I don't have enough energy to do anything", value: 3, order: 3 },
        ],
      },
      {
        order: 16, text: 'Changes in Sleeping Pattern', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I have not experienced any change in my sleeping', value: 0, order: 0 },
          { label: '1 — I sleep somewhat more or less than usual', value: 1, order: 1 },
          { label: '2 — I sleep a lot more or less than usual', value: 2, order: 2 },
          { label: '3 — I sleep most of the day, or I wake 1–2 hours early and cannot get back to sleep', value: 3, order: 3 },
        ],
      },
      {
        order: 17, text: 'Irritability', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I am no more irritable than usual', value: 0, order: 0 },
          { label: '1 — I am more irritable than usual', value: 1, order: 1 },
          { label: '2 — I am much more irritable than usual', value: 2, order: 2 },
          { label: '3 — I am irritable all the time', value: 3, order: 3 },
        ],
      },
      {
        order: 18, text: 'Changes in Appetite', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I have not experienced any change in my appetite', value: 0, order: 0 },
          { label: '1 — My appetite is somewhat less or greater than usual', value: 1, order: 1 },
          { label: '2 — My appetite is much less or greater than usual', value: 2, order: 2 },
          { label: '3 — I have no appetite at all, or I crave food all the time', value: 3, order: 3 },
        ],
      },
      {
        order: 19, text: 'Concentration Difficulty', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I can concentrate as well as ever', value: 0, order: 0 },
          { label: "1 — I can't concentrate as well as usual", value: 1, order: 1 },
          { label: "2 — It's hard to keep my mind on anything for very long", value: 2, order: 2 },
          { label: "3 — I find I can't concentrate on anything", value: 3, order: 3 },
        ],
      },
      {
        order: 20, text: 'Tiredness or Fatigue', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I am no more tired or fatigued than usual', value: 0, order: 0 },
          { label: '1 — I get tired or fatigued more easily than usual', value: 1, order: 1 },
          { label: '2 — I am too tired or fatigued to do many things I used to do', value: 2, order: 2 },
          { label: '3 — I am too tired or fatigued to do most things I used to do', value: 3, order: 3 },
        ],
      },
      {
        order: 21, text: 'Loss of Interest in Sex', type: 'MULTIPLE_CHOICE',
        options: [
          { label: '0 — I have not noticed any recent change in my interest in sex', value: 0, order: 0 },
          { label: '1 — I am less interested in sex than I used to be', value: 1, order: 1 },
          { label: '2 — I am much less interested in sex now', value: 2, order: 2 },
          { label: '3 — I have lost interest in sex completely', value: 3, order: 3 },
        ],
      },
    ],
    thresholds: [
      { label: 'Minimal', minScore: 0, maxScore: 13 },
      { label: 'Mild', minScore: 14, maxScore: 19 },
      { label: 'Moderate', minScore: 20, maxScore: 28 },
      { label: 'Severe', minScore: 29, maxScore: 63 },
    ],
  },
  {
    name: 'AUDIT',
    description: 'Alcohol Use Disorders Identification Test — 10-item alcohol screen',
    isLibrary: true,
    items: [
      { order: 1, text: 'How often do you have a drink containing alcohol?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Monthly or less', value: 1, order: 1 }, { label: '2–4 times a month', value: 2, order: 2 }, { label: '2–3 times a week', value: 3, order: 3 }, { label: '4+ times a week', value: 4, order: 4 }] },
      { order: 2, text: 'How many drinks containing alcohol do you have on a typical day when you are drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: '1–2', value: 0, order: 0 }, { label: '3–4', value: 1, order: 1 }, { label: '5–6', value: 2, order: 2 }, { label: '7–9', value: 3, order: 3 }, { label: '10+', value: 4, order: 4 }] },
      { order: 3, text: 'How often do you have 6 or more drinks on one occasion?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 4, text: 'How often during the last year have you found that you were not able to stop drinking once you had started?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 5, text: 'How often during the last year have you failed to do what was normally expected from you because of drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 6, text: 'How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 7, text: 'How often during the last year have you had a feeling of guilt or remorse after drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 8, text: 'How often during the last year have you been unable to remember what happened the night before because you had been drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'Never', value: 0, order: 0 }, { label: 'Less than monthly', value: 1, order: 1 }, { label: 'Monthly', value: 2, order: 2 }, { label: 'Weekly', value: 3, order: 3 }, { label: 'Daily or almost daily', value: 4, order: 4 }] },
      { order: 9, text: 'Have you or someone else been injured as a result of your drinking?', type: 'MULTIPLE_CHOICE', options: [{ label: 'No', value: 0, order: 0 }, { label: 'Yes, but not in the last year', value: 2, order: 1 }, { label: 'Yes, during the last year', value: 4, order: 2 }] },
      { order: 10, text: 'Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?', type: 'MULTIPLE_CHOICE', options: [{ label: 'No', value: 0, order: 0 }, { label: 'Yes, but not in the last year', value: 2, order: 1 }, { label: 'Yes, during the last year', value: 4, order: 2 }] },
    ],
    thresholds: [
      { label: 'Low Risk', minScore: 0, maxScore: 7 },
      { label: 'Hazardous', minScore: 8, maxScore: 15 },
      { label: 'Harmful', minScore: 16, maxScore: 19 },
      { label: 'Dependence Likely', minScore: 20, maxScore: 40 },
    ],
  },
  {
    name: 'DASS-21',
    description: 'Depression Anxiety Stress Scales — 21-item measure',
    isLibrary: true,
    items: [
      { order: 1, text: 'I found it hard to wind down', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 2, text: 'I was aware of dryness of my mouth', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 3, text: 'I could not seem to experience any positive feeling at all', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 4, text: 'I experienced breathing difficulty', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 5, text: 'I found it difficult to work up the initiative to do things', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 6, text: 'I tended to over-react to situations', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 7, text: 'I experienced trembling (e.g. in the hands)', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 8, text: 'I felt that I was using a lot of nervous energy', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 9, text: 'I was worried about situations in which I might panic and make a fool of myself', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 10, text: 'I felt that I had nothing to look forward to', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 11, text: 'I found myself getting agitated', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 12, text: 'I found it difficult to relax', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 13, text: 'I felt down-hearted and blue', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 14, text: 'I was intolerant of anything that kept me from getting on with what I was doing', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 15, text: 'I felt I was close to panic', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 16, text: 'I was unable to become enthusiastic about anything', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 17, text: 'I felt I was not worth much as a person', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 18, text: 'I felt that I was rather touchy', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 19, text: 'I was aware of the action of my heart in the absence of physical exertion', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 20, text: 'I felt scared without any good reason', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
      { order: 21, text: 'I felt that life was meaningless', type: 'MULTIPLE_CHOICE', options: FREQUENCY_OPTIONS },
    ],
    thresholds: [
      { label: 'Normal', minScore: 0, maxScore: 14 },
      { label: 'Mild', minScore: 15, maxScore: 28 },
      { label: 'Moderate', minScore: 29, maxScore: 42 },
      { label: 'Severe', minScore: 43, maxScore: 56 },
      { label: 'Extremely Severe', minScore: 57, maxScore: 63 },
    ],
  },
  {
    name: 'PCL-5',
    description:
      '20-item PTSD screen.\n\nIn the past month, how much were you bothered by the following?',
    isLibrary: true,
    items: [
      { order: 1,  text: 'Repeated, disturbing, and unwanted memories of the stressful experience', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 2,  text: 'Repeated, disturbing dreams of the stressful experience', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 3,  text: 'Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were reliving it)', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 4,  text: 'Feeling very upset when something reminded you of the stressful experience', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 5,  text: 'Having strong physical reactions when something reminded you of the stressful experience (e.g. heart pounding, trouble breathing, sweating)', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 6,  text: 'Avoiding memories, thoughts, or feelings related to the stressful experience', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 7,  text: 'Avoiding external reminders of the stressful experience (e.g. people, places, conversations, activities, objects, or situations)', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 8,  text: 'Trouble remembering important parts of the stressful experience', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 9,  text: 'Having strong negative beliefs about yourself, other people, or the world (e.g. "I am bad", "No one can be trusted", "The world is completely dangerous")', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 10, text: 'Blaming yourself or someone else for the stressful experience or what happened after it', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 11, text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 12, text: 'Loss of interest in activities that you used to enjoy', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 13, text: 'Feeling distant or cut off from other people', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 14, text: 'Trouble experiencing positive feelings (e.g. being unable to feel happiness or have loving feelings for people close to you)', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 15, text: 'Irritable behaviour, angry outbursts, or acting aggressively', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 16, text: 'Taking too many risks or doing things that could cause you harm', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 17, text: 'Being "superalert", watchful, or on guard', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 18, text: 'Feeling jumpy or easily startled', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 19, text: 'Having difficulty concentrating', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
      { order: 20, text: 'Trouble falling or staying asleep', type: 'MULTIPLE_CHOICE', options: PCL5_OPTIONS },
    ],
    thresholds: [
      { label: 'Minimal', minScore: 0, maxScore: 20 },
      { label: 'Mild', minScore: 21, maxScore: 32 },
      { label: 'Moderate', minScore: 33, maxScore: 44 },
      { label: 'Severe', minScore: 45, maxScore: 80 },
    ],
  },
]
