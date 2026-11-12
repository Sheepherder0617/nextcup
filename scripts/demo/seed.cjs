// Fictional demo data, dates relative to "today" so the app always looks current.
module.exports = function seed() {
  const pad = (n) => String(n).padStart(2, "0");
  const d = (off) => { const t = new Date(); t.setDate(t.getDate() + off); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
  const at = (off, hm) => `${d(off)}T${hm}`;
  const now = new Date().toISOString();
  const C = (id, name, title, company, extra) => ({ id, name, title, company, roleTypes: ["professional"], metVia: "event", metAt: "Rotman Tech Night", goals: ["career_exploration"], notes: "", createdAt: now, updatedAt: now, ...extra });
  const contacts = [
    C("c-marcus", "Marcus Lee", "Product Manager", "Northwind Pay", { roleTypes: ["alumni", "mentor"], school: "Rotman MMA", metAt: "Rotman Tech Night", firstMeetingDate: d(-49), lastContact: d(-49), goals: ["career_exploration", "relationship"], linkedin: "https://www.linkedin.com/in/example", notes: "Moved from data analytics to product 3 years ago. Leads the payments onboarding squad. Runs the summer intern program." }),
    C("c-sofia", "Sofia Martinez", "Senior Data Scientist", "Maple Analytics", { roleTypes: ["professional"], metVia: "online", metAt: "LinkedIn intro from a classmate", firstMeetingDate: d(-12), lastContact: d(-12), goals: ["advice"] }),
    C("c-daniel", "Daniel Okafor", "Analytics Manager", "Harbor Bank", { roleTypes: ["recruiter"], metAt: "Rotman career fair", firstMeetingDate: d(-20), lastContact: d(-20), goals: ["job_opportunities"] }),
    C("c-emma", "Emma Wilson", "Strategy Consultant", "Brightline Consulting", { roleTypes: ["alumni"], school: "University of Waterloo", metAt: "Waterloo alumni mixer", firstMeetingDate: d(-3), lastContact: d(-3), goals: ["career_exploration"] }),
    C("c-ryan", "Ryan Park", "ML Engineer", "Lumen Health", { roleTypes: ["professional"], metVia: "online", metAt: "AI meetup Discord", goals: ["career_exploration", "advice"] }),
    C("c-aisha", "Aisha Khan", "Director of Data", "Northwind Pay", { roleTypes: ["former_manager", "mentor"], metAt: "Co-op term", firstMeetingDate: d(-120), lastContact: d(-70), goals: ["relationship", "advice"] }),
  ];
  const E = (id, contactId, kind, start, extra) => ({ id, contactId, kind, start, durationMin: kind === "coffee" ? 30 : 15, status: "planned", createdAt: now, ...extra });
  const events = [
    E("e1", "c-marcus", "coffee", at(-49, "10:00"), { status: "done", format: "inperson", location: "Balzac's, Distillery District", title: "Analytics → product" }),
    E("e2", "c-marcus", "thankyou", at(-48, "09:00"), { status: "done" }),
    E("e3", "c-marcus", "followup", at(1, "09:30"), { title: "Check in on intern demo day" }),
    E("e4", "c-ryan", "coffee", at(0, "10:00"), { format: "video", link: "https://meet.example.com/abc", title: "ML engineering in healthcare" }),
    E("e5", "c-emma", "thankyou", at(0, "18:00"), {}),
    E("e6", "c-sofia", "coffee", at(-12, "16:00"), { status: "done", format: "video", title: "Breaking into data science" }),
    E("e7", "c-sofia", "followup", at(9, "10:00"), { title: "Share my Kaggle project" }),
    E("e8", "c-daniel", "coffee", at(3, "12:30"), { format: "inperson", location: "Harbor Bank HQ lobby café", title: "Analytics roles at Harbor" }),
    E("e9", "c-aisha", "followup", at(5, "11:00"), { title: "Quarterly catch-up" }),
    E("e10", "c-emma", "coffee", at(-3, "17:30"), { status: "done", format: "inperson", location: "Waterloo alumni mixer" }),
  ];
  const notes = [
    { id: "n1", contactId: "c-marcus", eventId: "e1", date: d(-49), kind: "debrief", headline: "From analytics to product at Northwind Pay", body: "• Moved from analytics to PM by owning one metric end to end\n• Suggests a case study that ends in a product decision, not just a dashboard\n• Intern projects ship to real users; demo day is in November\n• Offered to review my dbt case study", nextStep: "Send my dbt case study by Friday", createdAt: now },
    { id: "n2", contactId: "c-marcus", date: d(-45), kind: "followup_message", headline: "Sent dbt case study", body: "Shared the case study and thanked him for the intro to the onboarding squad.", createdAt: now },
    { id: "n3", contactId: "c-sofia", eventId: "e6", date: d(-12), kind: "debrief", headline: "Kaggle projects beat certificates", body: "• Hiring managers skim GitHub before the resume\n• Pick one messy real dataset and write up the trade-offs\n• Maple runs a new-grad cohort each spring", nextStep: "Finish the churn project and send it", createdAt: now },
  ];
  const profile = { name: "Sijie Demo", headline: "MMA candidate · Data & AI", school: "Rotman School of Management", location: "Toronto", status: "active", cycle: "Summer 2027 internships", targetRoles: ["Data Scientist", "Product Analyst"], wishlist: ["Northwind Pay", "Maple Analytics"], pitches: { s30: "", s60: "", s120: "" }, skills: ["SQL", "Python", "dbt"], tone: "warm", durationMin: 30, followUpWeeks: 6, createdAt: now };
  return { profile, contacts, events, notes };
};
