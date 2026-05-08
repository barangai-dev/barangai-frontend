"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";

export type Language = "en" | "tl" | "ceb";

type Dictionary = {
  [key: string]: string | Dictionary;
};
type DictionaryValue = string | Dictionary;

const STORAGE_KEY = "app_language";
const PREFERRED_LANGUAGE_KEY = "preferred_language";

const translations: Record<Language, Dictionary> = {
  en: {
    common: {
      welcome: "Welcome",
      save: "Save",
      cancel: "Cancel",
      search: "Search",
      settings: "Settings",
      language: "Language",
      english: "English",
      tagalog: "Tagalog",
      bisaya: "Bisaya",
      noEmailAvailable: "No email available",
    },
    nav: {
      dashboard: "Dashboard",
      chatbot: "Chatbot",
      courses: "Courses",
      activities: "Activities",
      statistics: "Statistics",
      settings: "Settings",
      profile: "Profile",
      logout: "Logout",
      editProfile: "Edit Profile",
    },
    topbar: {
      searchPlaceholder: "Search courses, lessons...",
      switchThemeTo: "Switch to",
      modeLight: "Light",
      modeDark: "Dark",
    },
    dashboardHero: {
      welcomeBack: "Welcome back",
      enrolledIn: "You're enrolled in",
      courses: "Courses",
      continueLearning: "CONTINUE LEARNING",
      yourSnapshot: "Your Snapshot",
      viewStatistics: "View Statistics",
      progress: "Progress",
      digitalProficiency: "Digital Proficiency",
      scoreGrowth: "Score Growth",
    },
    coursesPage: {
      loadingCourses: "Loading Courses...",
      yourCourses: "Your Courses",
      continueLearningWhereLeft: "Continue learning where you left off.",
      enrolled: "Enrolled",
      completed: "Completed",
      noCompletedCourses: "No completed courses yet. Finish a quiz to mark a lesson as complete.",
      noCoursesFound: "No courses found. Try a different search or refresh the page.",
      lesson: "lesson",
      lessons: "lessons",
      completedLower: "completed",
      progress: "progress",
      averageProgress: "average progress",
      inProgress: "In progress",
      notStarted: "Not started",
      score: "Score",
      openLesson: "Open Lesson",
      backToCourses: "Back to Courses",
      loadingLessons: "Loading lessons...",
      noLessonsFound: "No lessons found for this course.",
      backToLessons: "Back to Lessons",
      openResource: "Open Resource",
      downloadLesson: "Download Lesson",
      markIncomplete: "Mark Incomplete",
      completeCourse: "Complete Course",
      loadingCourse: "Loading course...",
      courseUnavailable: "Course unavailable",
      courseContent: "Course Content",
      noContentAvailable: "No content available for this course yet.",
      testYourKnowledge: "Test Your Knowledge",
      readyTakeQuiz: "Ready to check what you learned? Take the quiz for this lesson.",
      takeQuiz: "Take the Quiz",
      quizzes: "quizzes",
      latestScore: "latest score",
      savedOn: "Saved on",
      openBarangAIQuiz: "Open the BarangAI app -> Quizzes",
      savedFromBarangAI: "Saved from BarangAI - Open this file in any browser to read offline",
    },
    quizzesPage: {
      quizzes: "Quizzes",
      tasks: "Tasks",
      all: "ALL",
      pending: "PENDING",
      completed: "COMPLETED",
      loadingContent: "Loading content...",
      noQuizzesFound: "No quizzes found.",
      quizzesAvailable: "Quizzes Available",
      qs: "Qs",
      done: "Done",
      quizComplete: "Quiz Complete",
      score: "Score",
      gotCorrect: "You got {correct} out of {total} questions correct.",
      questionReview: "Question Review",
      reviewWarning: "Warning: The backend did not return the correct answers dictionary. Review highlighting is disabled.",
      correctAnswer: "Correct Answer",
      retakeQuiz: "Retake Quiz",
      pickAnotherQuiz: "Pick Another Quiz",
      prev: "Prev",
      next: "Next",
      submitting: "Submitting...",
      submitQuiz: "Submit Quiz",
      questionOf: "Question {current} of {total}",
      noQuizSelected: "No Quiz Selected",
      pickTopicToStart: "Pick a topic from the left sidebar to start testing your knowledge.",
      unansweredTitle: "Submit incomplete quiz?",
      unansweredDescription: "You still have {count} unanswered question{plural}. You can submit now, or go back and answer the remaining questions.",
      submitAnyway: "Submit Anyway",
      answerRemaining: "Answer Remaining",
    },
    auth: {
      welcomeTo: "WELCOME TO BARANGAI",
      adaptiveTagline: "Adaptive learning and AI help",
      heroTitle: "Adaptive system. Faster learning. Help with AI.",
      heroDescription:
        "From one-time seminars and long Google searches to work that could have been easier—everything you need to learn, adapt, and get assistance in one place.",
      backToHome: "Dashboard",
      welcomeBack: "Welcome back",
      createAccount: "Create your account",
      resetPassword: "Reset password",
      login: "Login",
      signUp: "Sign Up",
      email: "Email",
      password: "Password",
      confirm: "Confirm",
      firstName: "First name",
      lastName: "Last name",
      role: "Role",
      remember: "Remember",
      forgotPassword: "Forgot password?",
      signingIn: "Signing in...",
      creating: "Creating...",
      sendResetLink: "Send Reset Link",
      sending: "Sending...",
      backToLogin: "Back to Login",
      forgotDescription: "Enter your email address and we will send you a link to reset your password.",
      orContinueWith: "Or continue with",
      loginFailed: "Login failed",
      passwordsDoNotMatch: "Passwords do not match",
      signupFailed: "Signup failed",
      successReset: "Success! Check your email for the reset link.",
      resetError: "Something went wrong. Please try again.",
      networkError: "Network error. Is the backend running?",
      googleNoCredential: "Google sign-in failed: no credential.",
      googleLoginFailed: "Google login failed",
      networkGoogle: "Network error during Google login",
      emailExists: "Email already exists.",
    },
    roles: {
      captain: "Barangay Captain",
      councilor: "Barangay Councilor",
      secretary: "Barangay Secretary",
      treasurer: "Barangay Treasurer",
      kagawad: "Barangay Kagawad",
      encoder: "Barangay Encoder",
      official: "Barangay Official",
    },
  },
  tl: {
    common: {
      welcome: "Maligayang pagdating",
      save: "I-save",
      cancel: "Kanselahin",
      search: "Maghanap",
      settings: "Mga setting",
      language: "Wika",
      english: "Ingles",
      tagalog: "Tagalog",
      bisaya: "Bisaya",
      noEmailAvailable: "Walang email",
    },
    nav: {
      dashboard: "Dashboard",
      chatbot: "Chatbot",
      courses: "Mga Kurso",
      activities: "Mga Gawain",
      statistics: "Estadistika",
      settings: "Mga Setting",
      profile: "Profile",
      logout: "Mag-logout",
      editProfile: "I-edit ang Profile",
    },
    topbar: {
      searchPlaceholder: "Maghanap ng kurso, aralin...",
      switchThemeTo: "Lumipat sa",
      modeLight: "Light",
      modeDark: "Dark",
    },
    dashboardHero: {
      welcomeBack: "Maligayang pagbabalik",
      enrolledIn: "Naka-enroll ka sa",
      courses: "Mga Kurso",
      continueLearning: "IPAGPATULOY ANG PAG-AARAL",
      yourSnapshot: "Iyong Buod",
      viewStatistics: "Tingnan ang Estadistika",
      progress: "Progreso",
      digitalProficiency: "Kakayahang Digital",
      scoreGrowth: "Pagtaas ng Iskor",
    },
    coursesPage: {
      loadingCourses: "Nilo-load ang mga kurso...",
      yourCourses: "Iyong Mga Kurso",
      continueLearningWhereLeft: "Ipagpatuloy ang pag-aaral kung saan ka huminto.",
      enrolled: "Naka-enroll",
      completed: "Natapos",
      noCompletedCourses: "Wala pang natapos na kurso. Tapusin ang isang quiz para makumpleto ang aralin.",
      noCoursesFound: "Walang nahanap na kurso. Subukan ang ibang paghahanap o i-refresh ang page.",
      lesson: "aralin",
      lessons: "mga aralin",
      completedLower: "natapos",
      progress: "progreso",
      averageProgress: "average na progreso",
      inProgress: "Kasalukuyang ginagawa",
      notStarted: "Hindi pa nasisimulan",
      score: "Iskor",
      openLesson: "Buksan ang Aralin",
      backToCourses: "Bumalik sa Mga Kurso",
      loadingLessons: "Nilo-load ang mga aralin...",
      noLessonsFound: "Walang nahanap na aralin para sa kursong ito.",
      backToLessons: "Bumalik sa Mga Aralin",
      openResource: "Buksan ang Resource",
      downloadLesson: "I-download ang Aralin",
      markIncomplete: "Markahan bilang Hindi Kumpleto",
      completeCourse: "Kumpletuhin ang Kurso",
      loadingCourse: "Nilo-load ang kurso...",
      courseUnavailable: "Hindi available ang kurso",
      courseContent: "Nilalaman ng Kurso",
      noContentAvailable: "Wala pang available na nilalaman para sa kursong ito.",
      testYourKnowledge: "Subukan ang Iyong Kaalaman",
      readyTakeQuiz: "Handa ka na bang subukan ang natutunan mo? Sagutan ang quiz para sa araling ito.",
      takeQuiz: "Sagutan ang Quiz",
      quizzes: "mga quiz",
      latestScore: "pinakabagong iskor",
      savedOn: "Na-save noong",
      openBarangAIQuiz: "Buksan ang BarangAI app -> Mga Quiz",
      savedFromBarangAI: "Na-save mula sa BarangAI - Buksan ang file na ito sa kahit anong browser para basahin offline",
    },
    quizzesPage: {
      quizzes: "Mga Quiz",
      tasks: "Mga Gawain",
      all: "LAHAT",
      pending: "PENDING",
      completed: "TAPOS",
      loadingContent: "Nilo-load ang nilalaman...",
      noQuizzesFound: "Walang nahanap na quiz.",
      quizzesAvailable: "Available na Mga Quiz",
      qs: "Tanong",
      done: "Tapos",
      quizComplete: "Tapos na ang Quiz",
      score: "Iskor",
      gotCorrect: "Nakakuha ka ng {correct} sa {total} tamang sagot.",
      questionReview: "Review ng Tanong",
      reviewWarning: "Babala: Hindi ibinalik ng backend ang listahan ng tamang sagot. Naka-disable ang review highlighting.",
      correctAnswer: "Tamang Sagot",
      retakeQuiz: "Ulitin ang Quiz",
      pickAnotherQuiz: "Pumili ng Ibang Quiz",
      prev: "Nakaraan",
      next: "Susunod",
      submitting: "Isinusumite...",
      submitQuiz: "Isumite ang Quiz",
      questionOf: "Tanong {current} sa {total}",
      noQuizSelected: "Walang Napiling Quiz",
      pickTopicToStart: "Pumili ng topic sa kaliwang sidebar para simulan ang pagsusulit.",
      unansweredTitle: "Isumite ang hindi kumpletong quiz?",
      unansweredDescription: "Mayroon ka pang {count} hindi nasasagutang tanong. Maaari mong isumite ngayon, o bumalik para sagutan ang natitirang tanong.",
      submitAnyway: "Isumite Pa Rin",
      answerRemaining: "Sagutan Muna",
    },
    auth: {
      welcomeTo: "MALIGAYANG PAGDATING SA BARANGAI",
      adaptiveTagline: "Adaptive learning at AI na tulong",
      heroTitle: "Adaptive system. Mas mabilis na pagkatuto. Tulong ng AI.",
      heroDescription:
        "Mula sa one-time seminar at mahahabang Google search, nasa iisang lugar na ang kailangan para matuto, mag-adapt, at humingi ng tulong.",
      backToHome: "Dashboard",
      welcomeBack: "Maligayang pagbabalik",
      createAccount: "Gumawa ng account",
      resetPassword: "I-reset ang password",
      login: "Mag-login",
      signUp: "Mag-sign up",
      email: "Email",
      password: "Password",
      confirm: "Kumpirmahin",
      firstName: "Pangalan",
      lastName: "Apelyido",
      role: "Tungkulin",
      remember: "Tandaan ako",
      forgotPassword: "Nakalimutan ang password?",
      signingIn: "Nagsa-sign in...",
      creating: "Ginagawa...",
      sendResetLink: "Ipadala ang Reset Link",
      sending: "Ipinapadala...",
      backToLogin: "Bumalik sa Login",
      forgotDescription: "Ilagay ang email at padadalhan ka namin ng link para mag-reset ng password.",
      orContinueWith: "O magpatuloy gamit ang",
      loginFailed: "Hindi nakapag-login",
      passwordsDoNotMatch: "Hindi tugma ang mga password",
      signupFailed: "Hindi nakapag-signup",
      successReset: "Tagumpay! Suriin ang iyong email para sa reset link.",
      resetError: "May mali. Pakisubukang muli.",
      networkError: "Network error. Naka-run ba ang backend?",
      googleNoCredential: "Nabigo ang Google sign-in: walang credential.",
      googleLoginFailed: "Nabigo ang Google login",
      networkGoogle: "Network error habang Google login",
      emailExists: "May account na ang email na ito.",
    },
    roles: {
      captain: "Kapitan ng Barangay",
      councilor: "Konsehal ng Barangay",
      secretary: "Kalihim ng Barangay",
      treasurer: "Ingat-yaman ng Barangay",
      kagawad: "Kagawad ng Barangay",
      encoder: "Encoder ng Barangay",
      official: "Opisyal ng Barangay",
    },
  },
  ceb: {
    common: {
      welcome: "Maayong pag-abot",
      save: "I-save",
      cancel: "Kanselahon",
      search: "Pangita",
      settings: "Mga setting",
      language: "Pinulongan",
      english: "Iningles",
      tagalog: "Tagalog",
      bisaya: "Bisaya",
      noEmailAvailable: "Walay email",
    },
    nav: {
      dashboard: "Dashboard",
      chatbot: "Chatbot",
      courses: "Mga Kurso",
      activities: "Mga Aktibidad",
      statistics: "Estadistika",
      settings: "Mga Setting",
      profile: "Profile",
      logout: "Pag-logout",
      editProfile: "Usba ang Profile",
    },
    topbar: {
      searchPlaceholder: "Pangita ug kurso, leksyon...",
      switchThemeTo: "Balhin sa",
      modeLight: "Light",
      modeDark: "Dark",
    },
    dashboardHero: {
      welcomeBack: "Maayong pagbalik",
      enrolledIn: "Naka-enroll ka sa",
      courses: "Mga Kurso",
      continueLearning: "PADAYON PAGTUON",
      yourSnapshot: "Imong Snapshot",
      viewStatistics: "Tan-awa ang Estadistika",
      progress: "Progreso",
      digitalProficiency: "Digital nga Kahibalo",
      scoreGrowth: "Pagtubo sa Iskor",
    },
    coursesPage: {
      loadingCourses: "Nag-load sa mga kurso...",
      yourCourses: "Imong Mga Kurso",
      continueLearningWhereLeft: "Padayona ang pagtuon kung asa ka nihunong.",
      enrolled: "Naka-enroll",
      completed: "Nahuman",
      noCompletedCourses: "Wala pay nahuman nga kurso. Humana ang quiz aron makumpleto ang leksyon.",
      noCoursesFound: "Walay nakitang kurso. Sulayi ang laing pangita o i-refresh ang page.",
      lesson: "leksyon",
      lessons: "mga leksyon",
      completedLower: "nahuman",
      progress: "progreso",
      averageProgress: "average nga progreso",
      inProgress: "Nagpadayon",
      notStarted: "Wala pa masugdi",
      score: "Iskor",
      openLesson: "Ablihi ang Leksyon",
      backToCourses: "Balik sa Mga Kurso",
      loadingLessons: "Nag-load sa mga leksyon...",
      noLessonsFound: "Walay nakitang leksyon para ani nga kurso.",
      backToLessons: "Balik sa Mga Leksyon",
      openResource: "Ablihi ang Resource",
      downloadLesson: "I-download ang Leksyon",
      markIncomplete: "Markahi nga Dili Kumpleto",
      completeCourse: "Kompletoha ang Kurso",
      loadingCourse: "Nag-load sa kurso...",
      courseUnavailable: "Dili available ang kurso",
      courseContent: "Nilalaman sa Kurso",
      noContentAvailable: "Wala pay available nga sulod para ani nga kurso.",
      testYourKnowledge: "Sulayi ang Imong Kahibalo",
      readyTakeQuiz: "Andam ka na bang susihon ang imong nakat-unan? Tubaga ang quiz para ani nga leksyon.",
      takeQuiz: "Tubaga ang Quiz",
      quizzes: "mga quiz",
      latestScore: "pinakabag-ong iskor",
      savedOn: "Na-save niadtong",
      openBarangAIQuiz: "Ablihi ang BarangAI app -> Mga Quiz",
      savedFromBarangAI: "Na-save gikan sa BarangAI - Ablihi kini nga file sa bisan unsang browser aron mabasa offline",
    },
    quizzesPage: {
      quizzes: "Mga Quiz",
      tasks: "Mga Buluhaton",
      all: "TANAN",
      pending: "PENDING",
      completed: "HUMAN",
      loadingContent: "Nag-load sa sulod...",
      noQuizzesFound: "Walay nakitang quiz.",
      quizzesAvailable: "Available nga Mga Quiz",
      qs: "Pangutana",
      done: "Human",
      quizComplete: "Human na ang Quiz",
      score: "Iskor",
      gotCorrect: "Nakakuha ka og {correct} sa {total} nga sakto nga tubag.",
      questionReview: "Review sa Pangutana",
      reviewWarning: "Pahimangno: Wala gibalik sa backend ang listahan sa sakto nga tubag. Naka-disable ang review highlighting.",
      correctAnswer: "Sakto nga Tubag",
      retakeQuiz: "Usba ang Quiz",
      pickAnotherQuiz: "Pagpili og Laing Quiz",
      prev: "Miagi",
      next: "Sunod",
      submitting: "Ginasumiter...",
      submitQuiz: "Isumiter ang Quiz",
      questionOf: "Pangutana {current} sa {total}",
      noQuizSelected: "Walay Napiling Quiz",
      pickTopicToStart: "Pagpili og topic sa wala nga sidebar aron magsugod sa pagsulay sa imong kahibalo.",
      unansweredTitle: "Isumiter ang dili kompleto nga quiz?",
      unansweredDescription: "Aduna pa kay {count} nga wala matubag nga pangutana. Pwede nimo isumiter karon, o balik para tubagon ang nahabilin.",
      submitAnyway: "Isumiter Gihapon",
      answerRemaining: "Tubagon Una",
    },
    auth: {
      welcomeTo: "MAAYONG PAG-ABOT SA BARANGAI",
      adaptiveTagline: "Adaptive learning ug tabang sa AI",
      heroTitle: "Adaptive system. Mas paspas nga pagtuon. Tabang sa AI.",
      heroDescription:
        "Gikan sa one-time seminars ug taas nga Google search, ania na sa usa ka lugar ang tanan para makat-on, makaangay, ug makapangayo og tabang.",
      backToHome: "Dashboard",
      welcomeBack: "Maayong pagbalik",
      createAccount: "Paghimo ug account",
      resetPassword: "I-reset ang password",
      login: "Pag-login",
      signUp: "Pag-sign up",
      email: "Email",
      password: "Password",
      confirm: "Kumpirma",
      firstName: "Ngalan",
      lastName: "Apelyido",
      role: "Papel",
      remember: "Hinumdumi ko",
      forgotPassword: "Nakalimot sa password?",
      signingIn: "Nagasulod...",
      creating: "Ginahimo...",
      sendResetLink: "Ipadala ang Reset Link",
      sending: "Gipadala...",
      backToLogin: "Balik sa Login",
      forgotDescription: "Ibutang ang imong email ug padal-an ka namo og link sa pag-reset sa password.",
      orContinueWith: "O ipadayon gamit ang",
      loginFailed: "Napakyas ang pag-login",
      passwordsDoNotMatch: "Dili magkapareho ang password",
      signupFailed: "Napakyas ang signup",
      successReset: "Sakto! Tan-awa ang imong email para sa reset link.",
      resetError: "Adunay sayop. Sulayi pag-usab.",
      networkError: "Network error. Nagaandar ba ang backend?",
      googleNoCredential: "Napakyas ang Google sign-in: walay credential.",
      googleLoginFailed: "Napakyas ang Google login",
      networkGoogle: "Network error sa Google login",
      emailExists: "Aduna nay account ning email.",
    },
    roles: {
      captain: "Kapitan sa Barangay",
      councilor: "Konsehal sa Barangay",
      secretary: "Sekretaryo sa Barangay",
      treasurer: "Ingat-yaman sa Barangay",
      kagawad: "Kagawad sa Barangay",
      encoder: "Encoder sa Barangay",
      official: "Opisyal sa Barangay",
    },
  },
};

function flattenDictionary(
  dictionary: Dictionary,
  prefix = ""
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(dictionary)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[nextKey] = value;
    } else {
      Object.assign(out, flattenDictionary(value as Dictionary, nextKey));
    }
  }
  return out;
}

const flattenedTranslations: Record<Language, Record<string, string>> = {
  en: flattenDictionary(translations.en),
  tl: flattenDictionary(translations.tl),
  ceb: flattenDictionary(translations.ceb),
};

const reverseByLanguage: Record<Language, Record<string, string>> = {
  en: Object.entries(flattenedTranslations.en).reduce((acc, [key, value]) => {
    acc[value.trim().toLowerCase()] = key;
    return acc;
  }, {} as Record<string, string>),
  tl: Object.entries(flattenedTranslations.tl).reduce((acc, [key, value]) => {
    acc[value.trim().toLowerCase()] = key;
    return acc;
  }, {} as Record<string, string>),
  ceb: Object.entries(flattenedTranslations.ceb).reduce((acc, [key, value]) => {
    acc[value.trim().toLowerCase()] = key;
    return acc;
  }, {} as Record<string, string>),
};

const phraseTranslations: Record<Exclude<Language, "en">, Record<string, string>> = {
  tl: {
    "activity submissions": "Mga Isinumiteng Aktibidad",
    "activity video": "Video ng Aktibidad",
    "adjust your visual workspace options.": "Ayusin ang hitsura ng iyong workspace.",
    administration: "Pangangasiwa",
    "admin dashboard": "Admin Dashboard",
    "ai language preferences": "Mga Kagustuhan sa Wika ng AI",
    appearance: "Hitsura",
    "auto-detect": "Awtomatikong Tukuyin",
    "barangai desktop overlay": "BarangAI Desktop Overlay",
    "chatbot download overlay": "Chatbot Download Overlay",
    "click any row to view detailed progress": "Pumili ng row para makita ang detalyadong progreso",
    "confirm password": "Kumpirmahin ang Password",
    correct: "Tama",
    "course unavailable": "Hindi available ang kurso",
    "create new password": "Gumawa ng Bagong Password",
    "delete account?": "Burahin ang Account?",
    "digital literacy certificate": "Sertipiko sa Digital Literacy",
    "download now": "I-download Ngayon",
    "edit profile": "I-edit ang Profile",
    "email address": "Email Address",
    "first name": "Pangalan",
    "full quiz history": "Buong Kasaysayan ng Quiz",
    "generating learning path": "Ginagawa ang Learning Path",
    "get instant assistance, fast community resources, and workflow help directly on your desktop without leaving your current window.":
      "Makakuha agad ng tulong, mabilis na community resources, at gabay sa workflow diretso sa iyong desktop nang hindi umaalis sa kasalukuyang window.",
    guest: "Bisita",
    hours: "Oras",
    "install now!": "I-install Ngayon!",
    instructions: "Mga Tagubilin",
    issued: "Inisyu",
    "last action": "Huling Aksyon",
    "last name": "Apelyido",
    "latest submission": "Pinakabagong Isinumite",
    "lesson progress by topic": "Progreso ng Aralin ayon sa Paksa",
    "linked course": "Nakaugnay na Kurso",
    "loading tasks...": "Nilo-load ang mga gawain...",
    "maintenance banner": "Maintenance Banner",
    "manage users, courses, quizzes & tracking": "Pamahalaan ang users, kurso, quiz, at tracking",
    message: "Mensahe",
    name: "Pangalan",
    "needs more focus": "Kailangan Pang Pagtuunan",
    "new password": "Bagong Password",
    "no lesson progress found.": "Walang nahanap na progreso sa aralin.",
    "no pending emails to show.": "Walang pending na email na ipapakita.",
    "no pending tasks.": "Walang pending na gawain.",
    "no quiz attempts yet. complete a quiz to start your growth timeline.":
      "Wala pang quiz attempts. Tapusin ang isang quiz para simulan ang iyong growth timeline.",
    "no quiz selected": "Walang Napiling Quiz",
    "no reviewed tasks yet.": "Wala pang nasuring gawain.",
    "not quite ready yet!": "Hindi pa handa!",
    "notifications & promos": "Mga Notification at Promo",
    office: "Opisina",
    "other barangay official": "Ibang Opisyal ng Barangay",
    "overall progress report": "Kabuuang Ulat ng Progreso",
    "password updated!": "Na-update ang Password!",
    "pending emails": "Mga Pending na Email",
    "pending queue": "Pending Queue",
    phone: "Telepono",
    questions: "Mga Tanong",
    "quiz title": "Pamagat ng Quiz",
    "ready to check what you learned? go back online and take the quiz for this lesson.":
      "Handa ka na bang subukan ang natutunan mo? Bumalik online at sagutan ang quiz para sa araling ito.",
    "recent attempts": "Mga Kamakailang Attempt",
    "redirecting you to login...": "Ire-redirect ka sa login...",
    "requirements to meet:": "Mga kailangang kumpletuhin:",
    "resource url (optional)": "Resource URL (opsyonal)",
    "select a course": "Pumili ng kurso",
    "select a task from the left panel to view details.": "Pumili ng gawain sa kaliwang panel para makita ang detalye.",
    "send us a message": "Magpadala ng Mensahe",
    "show the scrolling warning banner across all pages.": "Ipakita ang gumagalaw na warning banner sa lahat ng page.",
    "site settings": "Mga Setting ng Site",
    "submit your output": "Isumite ang Iyong Output",
    "task activities": "Mga Gawain sa Aktibidad",
    "task title": "Pamagat ng Gawain",
    "task type": "Uri ng Gawain",
    "test your knowledge": "Subukan ang Iyong Kaalaman",
    title: "Pamagat",
    topic: "Paksa",
    "topic accuracy distribution": "Distribusyon ng Accuracy ayon sa Paksa",
    "topic growth overview": "Overview ng Pag-unlad ayon sa Paksa",
    "top strengths": "Mga Pangunahing Kalakasan",
    "track a user": "I-track ang User",
    "upload screenshot/image": "Mag-upload ng screenshot/image",
    "verification id": "Verification ID",
    "verifying eligibility...": "Sinusuri ang eligibility...",
    "we typically respond within 1-2 business days.": "Karaniwan kaming sumasagot sa loob ng 1-2 business days.",
  },
  ceb: {
    "activity submissions": "Mga Gisumiter nga Aktibidad",
    "activity video": "Video sa Aktibidad",
    "adjust your visual workspace options.": "Usba ang hitsura sa imong workspace.",
    administration: "Administrasyon",
    "admin dashboard": "Admin Dashboard",
    "ai language preferences": "Mga Gipili nga Pinulongan sa AI",
    appearance: "Hitsura",
    "auto-detect": "Awtomatikong Ilha",
    "barangai desktop overlay": "BarangAI Desktop Overlay",
    "chatbot download overlay": "Chatbot Download Overlay",
    "click any row to view detailed progress": "Pilia ang bisan unsang row aron makita ang detalyadong progreso",
    "confirm password": "Kumpirmaha ang Password",
    correct: "Sakto",
    "course unavailable": "Dili available ang kurso",
    "create new password": "Paghimo og Bag-ong Password",
    "delete account?": "Tangtangon ang Account?",
    "digital literacy certificate": "Sertipiko sa Digital Literacy",
    "download now": "I-download Karon",
    "edit profile": "Usba ang Profile",
    "email address": "Email Address",
    "first name": "Ngalan",
    "full quiz history": "Tibuok Kasaysayan sa Quiz",
    "generating learning path": "Naghimo og Learning Path",
    "get instant assistance, fast community resources, and workflow help directly on your desktop without leaving your current window.":
      "Makakuha dayon og tabang, paspas nga community resources, ug workflow nga giya diretso sa imong desktop nga dili mobiya sa imong kasamtangang window.",
    guest: "Bisita",
    hours: "Oras",
    "install now!": "I-install Karon!",
    instructions: "Mga Instruksyon",
    issued: "Giisyu",
    "last action": "Katapusang Aksyon",
    "last name": "Apelyido",
    "latest submission": "Pinakabag-ong Gisumiter",
    "lesson progress by topic": "Progreso sa Leksyon Matag Topic",
    "linked course": "Nakonektang Kurso",
    "loading tasks...": "Nag-load sa mga buluhaton...",
    "maintenance banner": "Maintenance Banner",
    "manage users, courses, quizzes & tracking": "Pagdumala sa users, kurso, quiz, ug tracking",
    message: "Mensahe",
    name: "Ngalan",
    "needs more focus": "Kinahanglan Pang Tutokan",
    "new password": "Bag-ong Password",
    "no lesson progress found.": "Walay nakitang progreso sa leksyon.",
    "no pending emails to show.": "Walay pending nga email nga ipakita.",
    "no pending tasks.": "Walay pending nga buluhaton.",
    "no quiz attempts yet. complete a quiz to start your growth timeline.":
      "Wala pay quiz attempts. Humana ang usa ka quiz aron masugdan ang imong growth timeline.",
    "no quiz selected": "Walay Napiling Quiz",
    "no reviewed tasks yet.": "Wala pay nareview nga buluhaton.",
    "not quite ready yet!": "Dili pa andam!",
    "notifications & promos": "Mga Notification ug Promo",
    office: "Opisina",
    "other barangay official": "Ubang Opisyal sa Barangay",
    "overall progress report": "Kinatibuk-ang Ulat sa Progreso",
    "password updated!": "Na-update ang Password!",
    "pending emails": "Mga Pending nga Email",
    "pending queue": "Pending Queue",
    phone: "Telepono",
    questions: "Mga Pangutana",
    "quiz title": "Titulo sa Quiz",
    "ready to check what you learned? go back online and take the quiz for this lesson.":
      "Andam ka na bang susihon ang imong nakat-unan? Balik online ug tubaga ang quiz para ani nga leksyon.",
    "recent attempts": "Bag-ong mga Attempt",
    "redirecting you to login...": "Gina-redirect ka sa login...",
    "requirements to meet:": "Mga kinahanglan makumpleto:",
    "resource url (optional)": "Resource URL (optional)",
    "select a course": "Pagpili og kurso",
    "select a task from the left panel to view details.": "Pagpili og buluhaton sa wala nga panel aron makita ang detalye.",
    "send us a message": "Padalhi mi og Mensahe",
    "show the scrolling warning banner across all pages.": "Ipakita ang nag-scroll nga warning banner sa tanang page.",
    "site settings": "Mga Setting sa Site",
    "submit your output": "Isumiter ang Imong Output",
    "task activities": "Mga Buluhaton sa Aktibidad",
    "task title": "Titulo sa Buluhaton",
    "task type": "Uri sa Buluhaton",
    "test your knowledge": "Sulayi ang Imong Kahibalo",
    title: "Titulo",
    topic: "Topic",
    "topic accuracy distribution": "Distribusyon sa Accuracy Matag Topic",
    "topic growth overview": "Overview sa Pag-uswag Matag Topic",
    "top strengths": "Pinakakusog nga Bahin",
    "track a user": "I-track ang User",
    "upload screenshot/image": "Pag-upload og screenshot/image",
    "verification id": "Verification ID",
    "verifying eligibility...": "Ginasusi ang eligibility...",
    "we typically respond within 1-2 business days.": "Kasagaran motubag mi sulod sa 1-2 business days.",
  },
};

const tokenTranslations: Record<Exclude<Language, "en">, Record<string, string>> = {
  tl: {
    dashboard: "dashboard",
    chatbot: "chatbot",
    courses: "mga kurso",
    course: "kurso",
    activities: "mga gawain",
    activity: "gawain",
    statistics: "estadistika",
    settings: "mga setting",
    profile: "profile",
    logout: "mag-logout",
    login: "mag-login",
    signup: "mag-sign up",
    save: "i-save",
    cancel: "kanselahin",
    edit: "i-edit",
    update: "i-update",
    delete: "tanggalin",
    search: "maghanap",
    language: "wika",
    english: "ingles",
    tagalog: "tagalog",
    bisaya: "bisaya",
    welcome: "maligayang pagdating",
    back: "bumalik",
    next: "susunod",
    previous: "nakaraan",
    continue: "ipagpatuloy",
    learning: "pag-aaral",
    progress: "progreso",
    score: "iskor",
    growth: "pagtaas",
    dark: "madilim",
    light: "maliwanag",
    mode: "mode",
    name: "pangalan",
    email: "email",
    password: "password",
    confirm: "kumpirmahin",
    role: "tungkulin",
    notifications: "mga abiso",
    admin: "admin",
    panel: "panel",
    users: "mga user",
    reports: "mga ulat",
    submit: "ipasa",
    reset: "i-reset",
    download: "i-download",
    upload: "i-upload",
    open: "buksan",
    close: "isara",
    view: "tingnan",
  },
  ceb: {
    dashboard: "dashboard",
    chatbot: "chatbot",
    courses: "mga kurso",
    course: "kurso",
    activities: "mga aktibidad",
    activity: "aktibidad",
    statistics: "estadistika",
    settings: "mga setting",
    profile: "profile",
    logout: "pag-logout",
    login: "pag-login",
    signup: "pag-sign up",
    save: "i-save",
    cancel: "kanselahon",
    edit: "usba",
    update: "i-update",
    delete: "tangtanga",
    search: "pangita",
    language: "pinulongan",
    english: "iningles",
    tagalog: "tagalog",
    bisaya: "bisaya",
    welcome: "maayong pag-abot",
    back: "balik",
    next: "sunod",
    previous: "miagi",
    continue: "padayon",
    learning: "pagtuon",
    progress: "progreso",
    score: "iskor",
    growth: "pagtubo",
    dark: "ngitngit",
    light: "hayag",
    mode: "mode",
    name: "ngalan",
    email: "email",
    password: "password",
    confirm: "kumpirma",
    role: "papel",
    notifications: "mga pahibalo",
    admin: "admin",
    panel: "panel",
    users: "mga user",
    reports: "mga report",
    submit: "ipasa",
    reset: "i-reset",
    download: "i-download",
    upload: "i-upload",
    open: "ablihi",
    close: "isirado",
    view: "tan-awa",
  },
};

function preserveCase(source: string, target: string): string {
  if (source.toUpperCase() === source) return target.toUpperCase();
  if (source[0] && source[0].toUpperCase() === source[0]) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

function translateTokens(language: Exclude<Language, "en">, text: string): string {
  const lexicon = tokenTranslations[language];
  return text.replace(/\b([A-Za-z]+)\b/g, (whole, word: string) => {
    const translated = lexicon[word.toLowerCase()];
    if (!translated) return whole;
    return preserveCase(whole, translated);
  });
}

function normalizePhrase(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function getEnglishPhraseKey(text: string): string | undefined {
  const normalized = normalizePhrase(text);
  if (phraseTranslations.tl[normalized] || phraseTranslations.ceb[normalized]) {
    return normalized;
  }

  for (const phrases of Object.values(phraseTranslations)) {
    const matched = Object.entries(phrases).find(
      ([, translated]) => normalizePhrase(translated) === normalized
    );
    if (matched) return matched[0];
  }

  return undefined;
}

function formatEnglishPhrase(phrase: string): string {
  const wordCount = phrase.match(/\b[A-Za-z]+\b/g)?.length ?? 0;
  const hasSentencePunctuation = /[.!]/.test(phrase);

  if (wordCount <= 4 && !hasSentencePunctuation) {
    return phrase
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\bAi\b/g, "AI")
      .replace(/\bUrl\b/g, "URL")
      .replace(/\bId\b/g, "ID");
  }

  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function translateKnownPhrase(language: Language, text: string): string | undefined {
  const leadingWhitespace = text.match(/^\s*/)?.[0] ?? "";
  const trailingWhitespace = text.match(/\s*$/)?.[0] ?? "";
  const englishKey = getEnglishPhraseKey(text);
  if (!englishKey) return undefined;

  if (language === "en") {
    return `${leadingWhitespace}${formatEnglishPhrase(englishKey)}${trailingWhitespace}`;
  }

  const translated = phraseTranslations[language][englishKey];
  return translated ? `${leadingWhitespace}${translated}${trailingWhitespace}` : undefined;
}

export function translateLooseText(language: Language, text: string): string {
  if (!text) return text;
  const normalized = text.trim().toLowerCase();
  const key =
    reverseByLanguage.en[normalized] ??
    reverseByLanguage.tl[normalized] ??
    reverseByLanguage.ceb[normalized];
  if (key) {
    return flattenedTranslations[language][key] ?? text;
  }

  const phrase = translateKnownPhrase(language, text);
  if (phrase) return phrase;

  if (language === "en") return text;
  const wordCount = text.match(/\b[A-Za-z]+\b/g)?.length ?? 0;
  if (wordCount > 3) return text;

  return translateTokens(language, text);
}

function shouldSkipElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "script" ||
    tagName === "style" ||
    tagName === "noscript" ||
    tagName === "code" ||
    tagName === "pre" ||
    element.closest("[data-no-i18n='true']") !== null
  );
}

const originalTextByNode = new WeakMap<Text, string>();
const originalAttributesByElement = new WeakMap<Element, Record<string, string>>();
const translatedAttributes = ["placeholder", "title", "aria-label"] as const;

function translateRootNode(language: Language, root: ParentNode) {
  if (typeof NodeFilter === "undefined") return;

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || shouldSkipElement(parent)) {
        return NodeFilter.FILTER_REJECT;
      }
      const raw = node.textContent ?? "";
      if (!raw.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let textNode = textWalker.nextNode();
  while (textNode) {
    textNodes.push(textNode as Text);
    textNode = textWalker.nextNode();
  }

  for (const node of textNodes) {
    const current = node.textContent ?? "";
    const original = originalTextByNode.get(node) ?? translateLooseText("en", current);
    originalTextByNode.set(node, original);

    const translated = translateLooseText(language, original);
    if (translated !== current) {
      node.textContent = translated;
    }
  }

  const attrTargets = [
    ...(root instanceof Element && root.matches("[placeholder], [title], [aria-label]") ? [root] : []),
    ...(root.querySelectorAll?.("[placeholder], [title], [aria-label]") ?? []),
  ];

  for (const element of attrTargets) {
    if (shouldSkipElement(element)) continue;
    const originals = originalAttributesByElement.get(element) ?? {};

    for (const attr of translatedAttributes) {
      const current = element.getAttribute(attr);
      if (!current) continue;

      const original = originals[attr] ?? translateLooseText("en", current);
      originals[attr] = original;

      const translated = translateLooseText(language, original);
      if (translated !== current) element.setAttribute(attr, translated);
    }

    originalAttributesByElement.set(element, originals);
  }
}

export const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "tl", label: "Tagalog" },
  { value: "ceb", label: "Bisaya" },
];

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function mapPreferredLanguage(value: string | null): Language | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "en" || normalized === "english" || normalized === "default") return "en";
  if (normalized === "tl" || normalized === "tagalog" || normalized === "fil" || normalized === "filipino")
    return "tl";
  if (
    normalized === "ceb" ||
    normalized === "bisaya" ||
    normalized === "cebuano" ||
    normalized === "visaya"
  )
    return "ceb";
  return undefined;
}

function toBackendLanguage(value: Language): "english" | "tagalog" | "cebuano" {
  if (value === "tl") return "tagalog";
  if (value === "ceb") return "cebuano";
  return "english";
}

function getNestedValue(dictionary: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let current: DictionaryValue | undefined = dictionary;

  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }

  return typeof current === "string" ? current : undefined;
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const persisted = localStorage.getItem(STORAGE_KEY);
      const preferred = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
      const resolved = mapPreferredLanguage(persisted) ?? mapPreferredLanguage(preferred) ?? "en";
      setLanguageState(resolved);
      document.documentElement.setAttribute("lang", resolved);
    } catch {
      setLanguageState("en");
    }
  }, []);

  useEffect(() => {
    const fromUser = mapPreferredLanguage(user?.preferred_language ?? null);
    if (!fromUser) return;
    setLanguageState(fromUser);
  }, [user?.preferred_language]);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const persisted = localStorage.getItem(STORAGE_KEY);
        const preferred = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
        const resolved = mapPreferredLanguage(persisted) ?? mapPreferredLanguage(preferred);
        if (!resolved) return;
        setLanguageState(resolved);
        document.documentElement.setAttribute("lang", resolved);
      } catch {}
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("preferred-language-changed", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("preferred-language-changed", syncFromStorage);
    };
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, toBackendLanguage(nextLanguage));
      window.dispatchEvent(new Event("preferred-language-changed"));
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", nextLanguage);
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (key: string, fallback?: string) => {
        const translated = getNestedValue(translations[language], key);
        if (translated) return translated;
        const englishFallback = getNestedValue(translations.en, key);
        return englishFallback ?? fallback ?? key;
      },
    };
  }, [language]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.body;
    if (!root) return;

    const runTranslation = () => translateRootNode(language, root);
    runTranslation();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translateRootNode(language, node as Element);
            } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
              translateRootNode(language, node.parentElement);
            }
          });
        } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateRootNode(language, mutation.target);
        }
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => observer.disconnect();
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
