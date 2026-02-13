import { lazy } from "react";

const ListenReveal = lazy(() => import("./ListenReveal"));
const ListenChoose = lazy(() => import("./ListenChoose"));
const ListenOrder = lazy(() => import("./ListenOrder"));
const ListenFillGap = lazy(() => import("./ListenFillGap"));
const SentenceBuilder = lazy(() => import("./SentenceBuilder"));

const EXERCISES = [
  {
    id: "listen-reveal",
    component: ListenReveal,
    localeKey: "learnExercises.listenReveal",
    icon: "ear-reveal",
    showInTabs: true,
    tabOrder: 0,
    requiresAudio: true,
  },
  // {
  //   id: "listen-choose",
  //   component: ListenChoose,
  //   localeKey: "learnExercises.listenChoose",
  //   icon: "ear-check",
  //   showInTabs: true,
  //   tabOrder: 1,
  //   requiresAudio: true,
  // },
  {
    id: "listen-order",
    component: ListenOrder,
    localeKey: "learnExercises.listenOrder",
    icon: "ear-sort",
    showInTabs: true,
    tabOrder: 2,
    requiresAudio: true,
  },
  {
    id: "listen-fill",
    component: ListenFillGap,
    localeKey: "learnExercises.listenFill",
    icon: "ear-blank",
    showInTabs: true,
    tabOrder: 3,
    requiresAudio: true,
  },
  {
    id: "sentence-builder",
    component: SentenceBuilder,
    localeKey: "learnExercises.sentenceBuilder",
    icon: "puzzle",
    showInTabs: false,
    tabOrder: 99,
    requiresAudio: false,
  },
];

export const getAllExercises = () =>
  [...EXERCISES].sort((a, b) => a.tabOrder - b.tabOrder);

export const getTabExercises = () =>
  EXERCISES.filter((e) => e.showInTabs).sort((a, b) => a.tabOrder - b.tabOrder);

export const getOverflowExercises = () =>
  EXERCISES.filter((e) => !e.showInTabs);

export const getExerciseById = (id) => EXERCISES.find((e) => e.id === id);

export const getDefaultExerciseId = () => "listen-reveal";

export default EXERCISES;
