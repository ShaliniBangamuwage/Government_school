'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'si' | 'ta';

const messages = {
  en: {
    language: 'Language', submitQuiz: 'Submit Quiz',
    english: 'English',
    sinhala: 'Sinhala',
    tamil: 'Tamil',
    overview: 'Overview',
    profile: 'Profile',
    textbooks: 'Textbooks',
    quizzes: 'Quizzes',
    simulators: 'Simulators',
    brainGame: 'Brain Game',
    progress: 'Progress',
    search: 'Search',
    searchDashboard: 'Search dashboard',
    notifications: 'Notifications',
    logout: 'Logout',
    account: 'Account',
    learningWorkspace: 'Learning workspace',
    studentWorkspace: 'Student workspace',
    trackClassesProgress: 'Track your classes and progress',
    loadingLearningDashboard: 'Loading your learning dashboard...',
    checkingStudentAccess: 'Checking student access...',
    saveProfile: 'Save profile',
    savingChanges: 'Saving changes...',
    profileUpdated: 'Profile updated successfully.',
    fullNameRequired: 'Full name is required.',
    aboutYou: 'About you',
    changeProfilePhoto: 'Change profile photo',
    editCoverPhoto: 'Edit cover photo',
    removePhoto: 'Remove photo',
    grade: 'Grade',
    medium: 'Medium',
    studentDashboard: 'Student dashboard',
    welcomeBack: 'Welcome back',
    mathematics: 'Mathematics',
    ready: 'Ready',
    onTrack: 'On track',
    quickAccess: 'Quick access', mathsTutor: 'Maths Tutor', tutorSubtitle: 'Ask a maths question and learn step by step.', tutorTopic: 'Topic', tutorQuestion: 'Your question', tutorQuestionPlaceholder: 'For example: How do I solve 2x + 5 = 17?', tutorAsk: 'Ask tutor', tutorThinking: 'Tutor is thinking...', tutorAnswer: 'Explanation', tutorSteps: 'Steps', tutorPractice: 'Try this next', tutorEmpty: 'Your explanation will appear here.', tutorError: 'The tutor could not answer right now. Please try again.', speakAnswer: 'Read explanation aloud', stopSpeaking: 'Stop voice', voiceInput: 'Ask with your voice', listening: 'Listening...', voiceUnavailable: 'Voice input is not supported in this browser.', liveTeacher: 'Live AI Teacher', startLiveTeacher: 'Start live teacher', stopLiveTeacher: 'End live lesson', liveTeacherStarting: 'Starting live teacher...', liveTeacherSetup: 'Live teacher setup is required.', liveTeacherReady: 'Your live teacher is ready.',
    openWorkspace: 'Open workspace',
    browseResources: 'Browse resources',
    viewAccount: 'View account',
    myMathematicsWorkspace: 'My Mathematics workspace',
    myCurriculum: 'My curriculum',
    viewTextbooks: 'View textbooks',
    loadingMathematics: 'Loading your Mathematics access...',
    noMathematicsAccess: 'No Mathematics access is available right now.',
    loadingTextbooks: 'Loading Mathematics textbooks...',
    noTextbooks: 'No verified Mathematics textbooks are available for your grade and language.',
    openCollection: 'Open collection',
    publishedQuizzes: 'Published Mathematics Quizzes',
    loadingQuizzes: 'Loading published quizzes...',
    noQuizzes: 'No published quizzes are available for your grade and medium yet.',
    questionCount: 'Question count',
    published: 'Published',
    startQuiz: 'Start Quiz',
    starting: 'Starting...',
    progressTitle: 'My Progress',
    progressDescription: 'A complete view of your submitted quiz results and next steps.',
    takeQuiz: 'Take a quiz',
    refresh: 'Refresh',
    analyzingResults: 'Analyzing your results...',
    averageScore: 'Average score',
    completed: 'Completed',
    passRate: 'Pass rate',
    bestScore: 'Best score',
    aiStudyCoach: 'AI study coach',
    topicPerformance: 'Topic performance',
    recentResults: 'Recent results', profileSetup: 'Profile setup', completeStudentProfile: 'Complete your student profile', profileSetupDescription: 'Choose the academic details tied to your learning profile before you continue.', enterFullName: 'Enter your full name', selectGrade: 'Select grade', preferredMedium: 'Preferred medium', saveAndContinue: 'Save and continue',
    accountSettings: 'Account', studentProfile: 'Student profile', profileDescription: 'Manage your identity, profile appearance, and learning preferences.', fullName: 'Full name', addIntroduction: 'Add a short introduction.', backToDashboard: 'Back to dashboard', interactiveLearning: 'Interactive learning', simulatorDescription: 'Learn by experimenting with interactive activities built for your lessons.', simulatorsAvailable: 'simulators available', simulatorAvailable: 'simulator available', searchSimulators: 'Search simulators', noMatchingSimulators: 'No matching simulators', noSimulators: 'No simulators yet', tryDifferentSearch: 'Try a different search term.', publishedActivities: 'Published activities will appear here when they are ready.', readyToUse: 'Ready to use', untitledSimulator: 'Untitled simulator', interactiveActivity: 'An interactive activity to help you practise and understand the lesson.', myResources: 'My resources', searchTextbook: 'Search textbook', clearFilters: 'Clear filters', allGrades: 'All grades', allMedia: 'All media', showing: 'Showing', verified: 'Verified', part: 'Part', lastVerified: 'Last verified', view: 'View', downloadThroughEdunexa: 'Download through EduNexa', unavailable: 'Unavailable', loadingTextbooksFull: 'Loading textbooks...', noMatchingTextbooks: 'No verified textbooks match the current filters.', recently: 'Recently', quizAttemptMissing: 'The quiz attempt is missing. Please start the quiz again.', quizSubmitted: 'Quiz submitted', score: 'Score', percentage: 'Percentage', status: 'Status', passed: 'Passed', needsPractice: 'Needs more practice', question: 'Question', answered: 'Answered', quizUnavailable: 'This quiz is not available.', acrossSubmittedQuizzes: 'Across submitted quizzes', submittedAttempts: 'Submitted attempts', passedCount: 'passed', personalBest: 'Personal best', topicInsights: 'Topic insights appear after your first submitted quiz.', noQuizResults: 'No submitted quiz results yet.', attempt: 'attempt', attempts: 'attempts', liveMathDuel: 'Live Math Duel', room: 'Room', round: 'Round', gameComplete: 'Game complete', createRoomPrompt: 'Create a room or join a friend with their six-character code.', hostPrivateDuel: 'Host a private duel', createRoom: 'Create room', roomCodePrompt: 'Have a room code?', joinDuel: 'Join a duel', roomCode: 'Room code', join: 'Join', waitingOpponent: 'Waiting for opponent', getReady: 'Get ready', duelComplete: 'Duel complete', bothStudentsJoin: 'Both students join to begin', target: 'Target', readyUp: 'Ready up', you: 'You', moves: 'moves', dropTiles: 'Drop tiles here', wrongAnswer: 'Wrong answer', reset: 'Reset', submitAnswer: 'Submit answer', submitted: 'Submitted', giveUp: 'Give up', opponent: 'Opponent', waiting: 'Waiting...', thinking: 'Thinking', progressLabel: 'Progress', closeNavigation: 'Close navigation menu', openNavigation: 'Open navigation menu', logoutAction: 'Log out',
  },
  si: {
    profileSetup: 'පැතිකඩ සැකසුම', completeStudentProfile: 'ඔබේ ශිෂ්‍ය පැතිකඩ සම්පූර්ණ කරන්න', profileSetupDescription: 'ඉදිරියට යාමට පෙර ඔබේ ඉගෙනුම් පැතිකඩට අදාළ අධ්‍යයන විස්තර තෝරන්න.', enterFullName: 'ඔබේ සම්පූර්ණ නම ඇතුළත් කරන්න', selectGrade: 'ශ්‍රේණිය තෝරන්න', preferredMedium: 'කැමති මාධ්‍යය', saveAndContinue: 'සුරකිමින් ඉදිරියට යන්න',
    language: 'භාෂාව', submitQuiz: 'ප්‍රශ්නාවලිය ඉදිරිපත් කරන්න', mathsTutor: 'ගණිත උපදේශක', tutorSubtitle: 'ගණිත ප්‍රශ්නයක් අසන්න සහ පියවරෙන් පියවර ඉගෙන ගන්න.', tutorTopic: 'මාතෘකාව', tutorQuestion: 'ඔබේ ප්‍රශ්නය', tutorQuestionPlaceholder: 'උදාහරණයක්: 2x + 5 = 17 විසඳන්නේ කෙසේද?', tutorAsk: 'උපදේශකගෙන් අසන්න', tutorThinking: 'උපදේශක සිතමින්...', tutorAnswer: 'පැහැදිලි කිරීම', tutorSteps: 'පියවර', tutorPractice: 'ඊළඟට මෙය උත්සාහ කරන්න', tutorEmpty: 'ඔබේ පැහැදිලි කිරීම මෙහි පෙන්වනු ඇත.', tutorError: 'උපදේශකයාට දැන් පිළිතුරු දිය නොහැක. නැවත උත්සාහ කරන්න.', speakAnswer: 'පැහැදිලි කිරීම හඬින් අසන්න', stopSpeaking: 'හඬ නවත්වන්න', voiceInput: 'ඔබේ හඬින් අසන්න', listening: 'සවන් දෙමින්...', voiceUnavailable: 'මෙම බ්‍රවුසරය හඬ ආදානයට සහාය නොදක්වයි.', liveTeacher: 'සජීවී AI ගුරුවරයා', startLiveTeacher: 'සජීවී ගුරුවරයා ආරම්භ කරන්න', stopLiveTeacher: 'සජීවී පාඩම අවසන් කරන්න', liveTeacherStarting: 'සජීවී ගුරුවරයා ආරම්භ කරමින්...', liveTeacherSetup: 'සජීවී ගුරු සැකසුම අවශ්‍යයි.', liveTeacherReady: 'ඔබේ සජීවී ගුරුවරයා සූදානම්.',
    english: 'ඉංග්‍රීසි',
    sinhala: 'සිංහල',
    tamil: 'දෙමළ',
    overview: 'දළ විශ්ලේෂණය',
    profile: 'පැතිකඩ',
    textbooks: 'පාඩම් පොත්',
    quizzes: 'ප්‍රශ්නාවලි',
    simulators: 'අනුකරණ',
    brainGame: 'මනස ක්‍රීඩාව',
    progress: 'ප්‍රගතිය',
    search: 'සොයන්න',
    searchDashboard: 'උපකරණ පුවරුව සොයන්න',
    notifications: 'දැනුම්දීම්',
    logout: 'ඉවත් වන්න',
    account: 'ගිණුම',
    learningWorkspace: 'ඉගෙනුම් වැඩබිම',
    studentWorkspace: 'ශිෂ්‍ය වැඩබිම',
    trackClassesProgress: 'ඔබේ පන්ති සහ ප්‍රගතිය නිරීක්ෂණය කරන්න',
    loadingLearningDashboard: 'ඔබේ ඉගෙනුම් උපකරණ පුවරුව පූරණය වෙමින්...',
    checkingStudentAccess: 'ශිෂ්‍ය ප්‍රවේශය පරීක්ෂා කරමින්...',
    saveProfile: 'පැතිකඩ සුරකින්න',
    savingChanges: 'වෙනස්කම් සුරකිමින්...',
    profileUpdated: 'පැතිකඩ සාර්ථකව යාවත්කාලීන කරන ලදී.',
    fullNameRequired: 'සම්පූර්ණ නම අවශ්‍යයි.',
    aboutYou: 'ඔබ ගැන',
    changeProfilePhoto: 'පැතිකඩ ඡායාරූපය වෙනස් කරන්න',
    editCoverPhoto: 'ආවරණ ඡායාරූපය සංස්කරණය කරන්න',
    removePhoto: 'ඡායාරූපය ඉවත් කරන්න',
    grade: 'ශ්‍රේණිය',
    medium: 'මාධ්‍යය',
    studentDashboard: 'ශිෂ්‍ය උපකරණ පුවරුව', welcomeBack: 'නැවත සාදරයෙන් පිළිගනිමු', mathematics: 'ගණිතය', ready: 'සූදානම්', onTrack: 'නිසි මාර්ගයේ', quickAccess: 'ඉක්මන් ප්‍රවේශය', openWorkspace: 'වැඩබිම විවෘත කරන්න', browseResources: 'සම්පත් පිරික්සන්න', viewAccount: 'ගිණුම බලන්න', myMathematicsWorkspace: 'මගේ ගණිත වැඩබිම', myCurriculum: 'මගේ විෂය මාලාව', viewTextbooks: 'පාඩම් පොත් බලන්න', loadingMathematics: 'ඔබේ ගණිත ප්‍රවේශය පූරණය වෙමින්...', noMathematicsAccess: 'දැනට ගණිත ප්‍රවේශයක් නොමැත.', loadingTextbooks: 'ගණිත පාඩම් පොත් පූරණය වෙමින්...', noTextbooks: 'ඔබේ ශ්‍රේණියට සහ භාෂාවට තහවුරු කළ පාඩම් පොත් නොමැත.', openCollection: 'එකතුව විවෘත කරන්න', publishedQuizzes: 'ප්‍රකාශිත ගණිත ප්‍රශ්නාවලි', loadingQuizzes: 'ප්‍රකාශිත ප්‍රශ්නාවලි පූරණය වෙමින්...', noQuizzes: 'ඔබේ ශ්‍රේණියට සහ මාධ්‍යයට ප්‍රකාශිත ප්‍රශ්නාවලි නොමැත.', questionCount: 'ප්‍රශ්න ගණන', published: 'ප්‍රකාශිත', startQuiz: 'ප්‍රශ්නාවලිය ආරම්භ කරන්න', starting: 'ආරම්භ කරමින්...', progressTitle: 'මගේ ප්‍රගතිය', progressDescription: 'ඔබ ඉදිරිපත් කළ ප්‍රශ්නාවලි ප්‍රතිඵල සහ ඉදිරි පියවර පිළිබඳ සම්පූර්ණ දැක්මක්.', takeQuiz: 'ප්‍රශ්නාවලියක් කරන්න', refresh: 'නැවුම් කරන්න', analyzingResults: 'ඔබේ ප්‍රතිඵල විශ්ලේෂණය කරමින්...', averageScore: 'සාමාන්‍ය ලකුණ', completed: 'සම්පූර්ණ කළ', passRate: 'සමත් අනුපාතය', bestScore: 'හොඳම ලකුණ', aiStudyCoach: 'AI අධ්‍යයන උපදේශක', topicPerformance: 'මාතෘකා කාර්යසාධනය', recentResults: 'මෑත ප්‍රතිඵල',
  },
  ta: {
    profileSetup: 'சுயவிவர அமைப்பு', completeStudentProfile: 'உங்கள் மாணவர் சுயவிவரத்தை நிறைவு செய்யவும்', profileSetupDescription: 'தொடர்வதற்கு முன் உங்கள் கற்றல் சுயவிவரத்துடன் தொடர்புடைய கல்வி விவரங்களைத் தேர்ந்தெடுக்கவும்.', enterFullName: 'உங்கள் முழுப் பெயரை உள்ளிடவும்', selectGrade: 'தரத்தைத் தேர்ந்தெடு', preferredMedium: 'விருப்பமான மொழிமூலம்', saveAndContinue: 'சேமித்து தொடரவும்',
    language: 'மொழி', submitQuiz: 'வினாடி வினாவைச் சமர்ப்பி', mathsTutor: 'கணிதப் பயிற்றுநர்', tutorSubtitle: 'கணிதக் கேள்வியைக் கேட்டு படிப்படியாகக் கற்றுக்கொள்ளுங்கள்.', tutorTopic: 'தலைப்பு', tutorQuestion: 'உங்கள் கேள்வி', tutorQuestionPlaceholder: 'எடுத்துக்காட்டு: 2x + 5 = 17 ஐ எவ்வாறு தீர்ப்பது?', tutorAsk: 'பயிற்றுநரிடம் கேள்', tutorThinking: 'பயிற்றுநர் சிந்திக்கிறார்...', tutorAnswer: 'விளக்கம்', tutorSteps: 'படிகள்', tutorPractice: 'அடுத்து இதை முயற்சிக்கவும்', tutorEmpty: 'உங்கள் விளக்கம் இங்கே தோன்றும்.', tutorError: 'பயிற்றுநரால் இப்போது பதிலளிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', speakAnswer: 'விளக்கத்தை சத்தமாகக் கேள்', stopSpeaking: 'குரலை நிறுத்து', voiceInput: 'உங்கள் குரலில் கேளுங்கள்', listening: 'கேட்கிறது...', voiceUnavailable: 'இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.', liveTeacher: 'நேரடி AI ஆசிரியர்', startLiveTeacher: 'நேரடி ஆசிரியரைத் தொடங்கு', stopLiveTeacher: 'நேரடி பாடத்தை முடி', liveTeacherStarting: 'நேரடி ஆசிரியர் தொடங்குகிறார்...', liveTeacherSetup: 'நேரடி ஆசிரியர் அமைப்பு தேவை.', liveTeacherReady: 'உங்கள் நேரடி ஆசிரியர் தயார்.',
    english: 'ஆங்கிலம்',
    sinhala: 'சிங்களம்',
    tamil: 'தமிழ்',
    overview: 'மேலோட்டம்',
    profile: 'சுயவிவரம்',
    textbooks: 'பாடப்புத்தகங்கள்',
    quizzes: 'வினாடி வினாக்கள்',
    simulators: 'செயற்கை மாதிரிகள்',
    brainGame: 'மூளை விளையாட்டு',
    progress: 'முன்னேற்றம்',
    search: 'தேடல்',
    searchDashboard: 'முகப்புப் பலகையைத் தேடு',
    notifications: 'அறிவிப்புகள்',
    logout: 'வெளியேறு',
    account: 'கணக்கு',
    learningWorkspace: 'கற்றல் பணியிடம்',
    studentWorkspace: 'மாணவர் பணியிடம்',
    trackClassesProgress: 'உங்கள் வகுப்புகள் மற்றும் முன்னேற்றத்தைப் பின்தொடருங்கள்',
    loadingLearningDashboard: 'உங்கள் கற்றல் முகப்புப் பலகை ஏற்றப்படுகிறது...',
    checkingStudentAccess: 'மாணவர் அணுகல் சரிபார்க்கப்படுகிறது...',
    saveProfile: 'சுயவிவரத்தைச் சேமி',
    savingChanges: 'மாற்றங்கள் சேமிக்கப்படுகின்றன...',
    profileUpdated: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது.',
    fullNameRequired: 'முழுப் பெயர் தேவை.',
    aboutYou: 'உங்களைப் பற்றி',
    changeProfilePhoto: 'சுயவிவரப் புகைப்படத்தை மாற்று',
    editCoverPhoto: 'அட்டை புகைப்படத்தைத் திருத்து',
    removePhoto: 'புகைப்படத்தை அகற்று',
    grade: 'தரம்',
    medium: 'மொழிமூலம்',
    studentDashboard: 'மாணவர் முகப்புப் பலகை', welcomeBack: 'மீண்டும் வரவேற்கிறோம்', mathematics: 'கணிதம்', ready: 'தயார்', onTrack: 'சரியான பாதையில்', quickAccess: 'விரைவு அணுகல்', openWorkspace: 'பணியிடத்தைத் திற', browseResources: 'வளங்களைப் பார்வையிடு', viewAccount: 'கணக்கைப் பார்', myMathematicsWorkspace: 'எனது கணிதப் பணியிடம்', myCurriculum: 'எனது பாடத்திட்டம்', viewTextbooks: 'பாடப்புத்தகங்களைப் பார்', loadingMathematics: 'உங்கள் கணித அணுகல் ஏற்றப்படுகிறது...', noMathematicsAccess: 'தற்போது கணித அணுகல் இல்லை.', loadingTextbooks: 'கணிதப் பாடப்புத்தகங்கள் ஏற்றப்படுகின்றன...', noTextbooks: 'உங்கள் தரம் மற்றும் மொழிக்கான சரிபார்க்கப்பட்ட பாடப்புத்தகங்கள் இல்லை.', openCollection: 'தொகுப்பைத் திற', publishedQuizzes: 'வெளியிடப்பட்ட கணித வினாடி வினாக்கள்', loadingQuizzes: 'வெளியிடப்பட்ட வினாடி வினாக்கள் ஏற்றப்படுகின்றன...', noQuizzes: 'உங்கள் தரம் மற்றும் மொழிக்கான வெளியிடப்பட்ட வினாடி வினாக்கள் இல்லை.', questionCount: 'கேள்விகளின் எண்ணிக்கை', published: 'வெளியிடப்பட்டது', startQuiz: 'வினாடி வினாவைத் தொடங்கு', starting: 'தொடங்குகிறது...', progressTitle: 'எனது முன்னேற்றம்', progressDescription: 'நீங்கள் சமர்ப்பித்த வினாடி வினா முடிவுகள் மற்றும் அடுத்த படிகளின் முழுமையான பார்வை.', takeQuiz: 'வினாடி வினா செய்', refresh: 'புதுப்பி', analyzingResults: 'உங்கள் முடிவுகள் பகுப்பாய்வு செய்யப்படுகின்றன...', averageScore: 'சராசரி மதிப்பெண்', completed: 'முடிந்தது', passRate: 'தேர்ச்சி விகிதம்', bestScore: 'சிறந்த மதிப்பெண்', aiStudyCoach: 'AI படிப்பு பயிற்சியாளர்', topicPerformance: 'தலைப்பு செயல்திறன்', recentResults: 'சமீபத்திய முடிவுகள்',
  },
} as const;

type MessageKey = keyof typeof messages.en;
const additionalMessages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en: {},
  si: {
    accountSettings: 'ගිණුම', studentProfile: 'ශිෂ්‍ය පැතිකඩ', profileDescription: 'ඔබේ අනන්‍යතාව, පැතිකඩ පෙනුම සහ ඉගෙනුම් මනාප කළමනාකරණය කරන්න.', fullName: 'සම්පූර්ණ නම', addIntroduction: 'කෙටි හැඳින්වීමක් එක් කරන්න.', backToDashboard: 'උපකරණ පුවරුවට ආපසු', interactiveLearning: 'අන්තර්ක්‍රියාකාරී ඉගෙනුම', simulatorDescription: 'ඔබේ පාඩම් සඳහා නිර්මාණය කළ අන්තර්ක්‍රියාකාරී ක්‍රියාකාරකම් අත්හදා බලමින් ඉගෙන ගන්න.', searchSimulators: 'අනුකරණ සොයන්න', noMatchingSimulators: 'ගැළපෙන අනුකරණ නොමැත', noSimulators: 'තවම අනුකරණ නොමැත', tryDifferentSearch: 'වෙනත් සෙවුම් පදයක් උත්සාහ කරන්න.', publishedActivities: 'ප්‍රකාශිත ක්‍රියාකාරකම් සූදානම් වූ විට මෙහි පෙන්වනු ඇත.', readyToUse: 'භාවිතයට සූදානම්', untitledSimulator: 'නම් නොකළ අනුකරණය', interactiveActivity: 'පාඩම තේරුම් ගැනීමට උපකාර වන අන්තර්ක්‍රියාකාරී ක්‍රියාකාරකමක්.', myResources: 'මගේ සම්පත්', searchTextbook: 'පාඩම් පොත සොයන්න', clearFilters: 'පෙරහන් හිස් කරන්න', allGrades: 'සියලු ශ්‍රේණි', allMedia: 'සියලු මාධ්‍ය', showing: 'පෙන්වන්නේ', verified: 'තහවුරු කළ', part: 'කොටස', lastVerified: 'අවසන් වරට තහවුරු කළේ', view: 'බලන්න', downloadThroughEdunexa: 'EduNexa හරහා බාගන්න', unavailable: 'ලබා ගත නොහැක', loadingTextbooksFull: 'පාඩම් පොත් පූරණය වෙමින්...', noMatchingTextbooks: 'වත්මන් පෙරහන්වලට ගැළපෙන තහවුරු කළ පාඩම් පොත් නොමැත.', recently: 'මෑතකදී', quizSubmitted: 'ප්‍රශ්නාවලිය ඉදිරිපත් කරන ලදී', score: 'ලකුණු', percentage: 'ප්‍රතිශතය', status: 'තත්ත්වය', passed: 'සමත්', needsPractice: 'තවත් පුහුණුව අවශ්‍යයි', question: 'ප්‍රශ්නය', answered: 'පිළිතුරු දුන්', quizUnavailable: 'මෙම ප්‍රශ්නාවලිය ලබා ගත නොහැක.', acrossSubmittedQuizzes: 'ඉදිරිපත් කළ ප්‍රශ්නාවලි සියල්ල', submittedAttempts: 'ඉදිරිපත් කළ උත්සාහ', passedCount: 'සමත්', personalBest: 'පුද්ගලික හොඳම', topicInsights: 'පළමු ප්‍රශ්නාවලිය ඉදිරිපත් කළ පසු මාතෘකා අවබෝධය පෙන්වනු ඇත.', noQuizResults: 'තවම ඉදිරිපත් කළ ප්‍රශ්නාවලි ප්‍රතිඵල නොමැත.', attempt: 'උත්සාහය', attempts: 'උත්සාහ', liveMathDuel: 'සජීවී ගණිත ද්වන්ධය', room: 'කාමරය', round: 'වටය', gameComplete: 'ක්‍රීඩාව අවසන්', createRoomPrompt: 'කාමරයක් සාදන්න හෝ අක්ෂර හයක කේතයෙන් මිතුරෙකු සමඟ එක්වන්න.', hostPrivateDuel: 'පෞද්ගලික ද්වන්ධයක් පවත්වන්න', createRoom: 'කාමරය සාදන්න', roomCodePrompt: 'කාමර කේතයක් තිබේද?', joinDuel: 'ද්වන්ධයට එක්වන්න', roomCode: 'කාමර කේතය', join: 'එක්වන්න', waitingOpponent: 'ප්‍රතිවාදියා බලාපොරොත්තුවෙන්', getReady: 'සූදානම් වන්න', duelComplete: 'ද්වන්ධය අවසන්', bothStudentsJoin: 'ආරම්භ කිරීමට සිසුන් දෙදෙනාම එක්විය යුතුය', target: 'ඉලක්කය', readyUp: 'සූදානම් බව දන්වන්න', you: 'ඔබ', moves: 'චලන', dropTiles: 'ටයිල් මෙහි දමන්න', wrongAnswer: 'වැරදි පිළිතුර', reset: 'යළි සකසන්න', submitAnswer: 'පිළිතුර ඉදිරිපත් කරන්න', submitted: 'ඉදිරිපත් කළා', giveUp: 'අත්හරින්න', opponent: 'ප්‍රතිවාදියා', waiting: 'බලාපොරොත්තුවෙන්...', thinking: 'සිතමින්', progressLabel: 'ප්‍රගතිය', logoutAction: 'ඉවත් වන්න',
  },
  ta: {
    accountSettings: 'கணக்கு', studentProfile: 'மாணவர் சுயவிவரம்', profileDescription: 'உங்கள் அடையாளம், சுயவிவர தோற்றம் மற்றும் கற்றல் விருப்பங்களை நிர்வகிக்கவும்.', fullName: 'முழுப் பெயர்', addIntroduction: 'சிறு அறிமுகத்தைச் சேர்க்கவும்.', backToDashboard: 'முகப்புப் பலகைக்குத் திரும்பு', interactiveLearning: 'ஊடாடும் கற்றல்', simulatorDescription: 'உங்கள் பாடங்களுக்காக உருவாக்கப்பட்ட ஊடாடும் செயல்பாடுகளைப் பரிசோதித்து கற்றுக்கொள்ளுங்கள்.', searchSimulators: 'செயற்கை மாதிரிகளைத் தேடு', noMatchingSimulators: 'பொருந்தும் செயற்கை மாதிரிகள் இல்லை', noSimulators: 'இன்னும் செயற்கை மாதிரிகள் இல்லை', tryDifferentSearch: 'வேறு தேடல் சொல்லை முயற்சிக்கவும்.', publishedActivities: 'வெளியிடப்பட்ட செயல்பாடுகள் தயாரானதும் இங்கே தோன்றும்.', readyToUse: 'பயன்படுத்தத் தயார்', untitledSimulator: 'பெயரிடப்படாத செயற்கை மாதிரி', interactiveActivity: 'பாடத்தைப் புரிந்துகொள்ள உதவும் ஊடாடும் செயல்பாடு.', myResources: 'எனது வளங்கள்', searchTextbook: 'பாடப்புத்தகத்தைத் தேடு', clearFilters: 'வடிகட்டிகளை அழி', allGrades: 'அனைத்து தரங்களும்', allMedia: 'அனைத்து மொழிமூலங்களும்', showing: 'காட்டப்படுவது', verified: 'சரிபார்க்கப்பட்டது', part: 'பகுதி', lastVerified: 'கடைசியாக சரிபார்க்கப்பட்டது', view: 'பார்', downloadThroughEdunexa: 'EduNexa வழியாகப் பதிவிறக்கு', unavailable: 'கிடைக்கவில்லை', loadingTextbooksFull: 'பாடப்புத்தகங்கள் ஏற்றப்படுகின்றன...', noMatchingTextbooks: 'தற்போதைய வடிகட்டிகளுடன் பொருந்தும் சரிபார்க்கப்பட்ட பாடப்புத்தகங்கள் இல்லை.', recently: 'சமீபத்தில்', quizSubmitted: 'வினாடி வினா சமர்ப்பிக்கப்பட்டது', score: 'மதிப்பெண்', percentage: 'சதவீதம்', status: 'நிலை', passed: 'தேர்ச்சி', needsPractice: 'மேலும் பயிற்சி தேவை', question: 'கேள்வி', answered: 'பதிலளிக்கப்பட்டது', quizUnavailable: 'இந்த வினாடி வினா கிடைக்கவில்லை.', acrossSubmittedQuizzes: 'சமர்ப்பிக்கப்பட்ட வினாடி வினாக்கள் முழுவதும்', submittedAttempts: 'சமர்ப்பிக்கப்பட்ட முயற்சிகள்', passedCount: 'தேர்ச்சி', personalBest: 'தனிப்பட்ட சிறந்தது', topicInsights: 'முதல் வினாடி வினாவைச் சமர்ப்பித்த பிறகு தலைப்பு நுண்ணறிவுகள் தோன்றும்.', noQuizResults: 'சமர்ப்பிக்கப்பட்ட வினாடி வினா முடிவுகள் இல்லை.', attempt: 'முயற்சி', attempts: 'முயற்சிகள்', liveMathDuel: 'நேரடி கணிதப் போட்டி', room: 'அறை', round: 'சுற்று', gameComplete: 'விளையாட்டு முடிந்தது', createRoomPrompt: 'ஒரு அறையை உருவாக்கவும் அல்லது ஆறு எழுத்துக் குறியீட்டின் மூலம் நண்பருடன் இணையவும்.', hostPrivateDuel: 'தனிப்பட்ட போட்டியை நடத்துங்கள்', createRoom: 'அறையை உருவாக்கு', roomCodePrompt: 'அறைக் குறியீடு உள்ளதா?', joinDuel: 'போட்டியில் சேர்', roomCode: 'அறைக் குறியீடு', join: 'சேர்', waitingOpponent: 'எதிராளிக்காக காத்திருக்கிறது', getReady: 'தயாராகுங்கள்', duelComplete: 'போட்டி முடிந்தது', bothStudentsJoin: 'தொடங்க இரு மாணவர்களும் இணைய வேண்டும்', target: 'இலக்கு', readyUp: 'தயார் எனக் குறி', you: 'நீங்கள்', moves: 'நகர்வுகள்', dropTiles: 'டைல்களை இங்கே இடவும்', wrongAnswer: 'தவறான பதில்', reset: 'மீட்டமை', submitAnswer: 'பதிலைச் சமர்ப்பி', submitted: 'சமர்ப்பிக்கப்பட்டது', giveUp: 'விட்டுக்கொடு', opponent: 'எதிராளர்', waiting: 'காத்திருக்கிறது...', thinking: 'சிந்திக்கிறது', progressLabel: 'முன்னேற்றம்', logoutAction: 'வெளியேறு',
  },
};
type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem('edunexa-locale');
    if (stored === 'en' || stored === 'si' || stored === 'ta') setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('edunexa-locale', locale);
    document.documentElement.lang = locale === 'si' ? 'si' : locale === 'ta' ? 'ta' : 'en';
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key: MessageKey) => additionalMessages[locale][key] ?? (messages[locale] as Partial<Record<MessageKey, string>>)[key] ?? messages.en[key],
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
