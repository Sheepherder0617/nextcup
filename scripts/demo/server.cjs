const http = require("http"), fs = require("fs"), path = require("path");
const REPLIES = {
  tidy: { headline: "From analytics to ML in healthcare", body: "• Lumen's ML team is 6 people; analysts move in by owning model monitoring\n• Learn PyTorch basics, but strong SQL + evaluation skills matter more\n• Clinical data work needs privacy training (they cover it)\n• Ryan will flag the spring ML intern posting", nextStep: "Send Ryan a thank-you and ask about the spring posting" },
  followups: (dt) => ({ recommendedDate: dt, ideas: [
    { title: "Ask how demo day went", message: "Hi Marcus! Hope the intern demo day went well. I'd love to hear which project stole the show.", why: "Shows you remembered what mattered to him" },
    { title: "Share your progress", message: "Quick update: I turned your feedback into a case study that ends with a product decision. Thanks for the push!", why: "Closes the loop on his advice" },
    { title: "Offer something back", message: "I came across a great write-up on onboarding funnels in fintech and thought of your squad. Sharing in case it's useful.", why: "Gives value, not just asks" } ] }),
  prep: { opener: "Thanks for making time! I saw Lumen is growing its ML team. What's that been like?", questions: ["What does a typical week look like for an ML engineer at Lumen?", "How did you move from research into production ML?", "What skills would make an intern useful from day one?"], icebreakers: ["You both started in analytics", "You're both active in the AI meetup Discord"], agenda: [{ minutes: 5, item: "Intros and your 30-second pitch" }, { minutes: 15, item: "His path and the team's work" }, { minutes: 10, item: "Advice and next steps" }], research: ["Look up Lumen's recent ML blog posts", "Check the spring internship posting"] },
  draft: "Hi Ryan,\n\nThanks so much for taking the time to chat today. Hearing how you moved from analytics into ML at Lumen was really helpful, especially your point that strong evaluation skills matter as much as modelling.\n\nI'll start on the PyTorch basics you suggested. If the spring ML internship posting goes up, I'd really appreciate a heads-up.\n\nThanks again,\nSijie",
};
module.exports = function serve(root, port) {
  return http.createServer((q, r) => {
    if (q.url.startsWith("/api/ai")) {
      let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
        const { messages, json } = JSON.parse(b || "{}"); const p = messages.map((m) => m.content).join("\n");
        let text;
        if (!json) text = REPLIES.draft;
        else if (p.includes('"recommendedDate"')) { const t = new Date(); t.setDate(t.getDate() + 1); text = JSON.stringify(REPLIES.followups(t.toISOString().slice(0, 10))); }
        else if (p.includes('"headline"')) text = JSON.stringify(REPLIES.tidy);
        else if (p.includes('"opener"')) text = JSON.stringify(REPLIES.prep);
        else text = JSON.stringify({ skills: [] });
        setTimeout(() => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify({ text })); }, 1400);
      }); return;
    }
    let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
    const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const ct = { ".webp": "image/webp", ".html": "text/html", ".woff2": "font/woff2", ".css": "text/css", ".png": "image/png" }[path.extname(f)] || "application/octet-stream";
    r.writeHead(200, { "content-type": ct }); fs.createReadStream(f).pipe(r);
  }).listen(port);
};
