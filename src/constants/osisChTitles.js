import i18n from "./i18n";

export const bookWithChoices = {
  Matt: 5,
  Mark: 2,
  Luke: 3,
  John: 3,
};

export const getChoiceTitle = (book, menuInx, lng) => {
  let retVal;
  if (bookWithChoices[book] != null) {
    const useKey = `${book}.Choice.${menuInx}`;
    retVal = i18n.t(useKey, {lng});
  }
  return retVal;
};

export const getOsisChTitle = (book, chapter, lng) => {
  const useKey = `${book}.${chapter}`;
  return i18n.t(useKey, {lng});
};
