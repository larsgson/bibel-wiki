import React from 'react'
import DatePicker from "react-datepicker";
import { rangeArray } from '../utils/obj-functions'
import { addDays } from 'date-fns';
import { registerLocale, setDefaultLocale } from  "react-datepicker";
import enUsLocale from 'date-fns/locale/en-US';

registerLocale('en', enUsLocale)
setDefaultLocale('en')

import "react-datepicker/dist/react-datepicker.css";

const BiblePlanDatePicker = (props) => {
  const {
    date, 
    completedList, 
    firstDateOfPlan,
    daysSinceFirst,
    onChange, 
    isOpen, 
    onClose
  } = props

  const minDate = firstDateOfPlan
  const maxDate = addDays(firstDateOfPlan, daysSinceFirst);

  const completedDays = daysSinceFirst ? rangeArray(0,daysSinceFirst).map((val) => {
    if (completedList.includes(val)) {
      return addDays(firstDateOfPlan,val)
    }
  }) : []

  const uncompletedDays = daysSinceFirst ? rangeArray(0,daysSinceFirst).map((val) => {
    if (!completedList.includes(val)) {
      return addDays(firstDateOfPlan,val)
    }
  }) : []

  const highlightWithRanges = [
    {
      "react-datepicker__day--highlighted-custom-1": uncompletedDays,
    },
    {
      "react-datepicker__day--highlighted-custom-2": completedDays,
    },
  ];
  const handleOnChange = (date) => onChange && onChange(date)
  const handleCalendarClose = () => onClose && onClose()

  return (
    <DatePicker
      popperProps={{
        strategy: "fixed" // use this to make the popper position: fixed
      }}
      locale="en"
      selected={date}
      onChange={(date) => handleOnChange(date)}
      highlightDates={highlightWithRanges}
      dateFormat="d MMMM"
      onCalendarClose={handleCalendarClose}
      minDate={minDate}
      maxDate={maxDate}
      open={isOpen}
    />
  );
};

export default BiblePlanDatePicker
