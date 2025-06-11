import React from 'react'

const BiblePlanView = ({curEp,lng}) => {

  const isValidEp = !!curEp?.begin?.ch && !!curEp?.begin?.v && !!curEp?.end?.v 

  const previewProps = {
    verbose: true,
  }

  return (
      <div key="1">
        {isValidEp && <div {...previewProps} />}
      </div>
  );
}  

export default BiblePlanView
