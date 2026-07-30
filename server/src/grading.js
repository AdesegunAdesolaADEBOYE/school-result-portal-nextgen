// WAEC-style grading on a 0-100 total (CA out of 40 + Exam out of 60).
function gradeFor(total) {
  if (total >= 70) return { grade: "A1", remark: "Excellent" };
  if (total >= 60) return { grade: "B2", remark: "Very Good" };
  if (total >= 50) return { grade: "C4", remark: "Good" };
  if (total >= 45) return { grade: "D7", remark: "Fair" };
  if (total >= 40) return { grade: "E8", remark: "Pass" };
  return { grade: "F9", remark: "Needs improvement" };
}

module.exports = { gradeFor };
