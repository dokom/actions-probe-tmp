// The truth behind the figure: the After BrockDB picture as stations and tubes, and the
// seven request paths as hops. The build draws from it, and the page's readout, path list
// and tour read the same data, so the words and the motion cannot drift apart.

export const PRINCIPLES = {
  1: { name: "Front doors only", text: "No one reads or writes a database directly." },
  2: { name: "Two hubs, one border", text: "Ethos joins Ellucian's products. Brock's gateway joins the campus." },
  3: { name: "Every connection owned", text: "A published spec, an owner, a runbook and a check that it ran." },
  4: { name: "One sign-in", text: "Brock's account for every product. Services get only what they need." },
  5: { name: "Configure, do not customise", text: "Configure Banner. Close gaps in Ellucian's tools or on Brock's platform." },
  6: { name: "One trusted copy", text: "Institutional reports come from Brock's data platform." },
  7: { name: "One front per audience", text: "Students use Ellucian Experience. Staff tools start on Power Platform." },
  8: { name: "One register", text: "Everything built has an owner, a review date and a retirement trigger." },
};

// team: who runs or owns it, as on the visual's legend.
export const STATIONS = {
  EXP: { name: "Ellucian Experience", part: "student kiosk", team: "product", role: "The front for students. Faculty use its cards too." },
  ETHOS: { name: "Ethos", part: "Ellucian's exchange", team: "ellucian", role: "Ellucian's own hub. It joins Ellucian's products." },
  BANNER: { name: "Banner", part: "vault cabinet", team: "product", role: "Ellucian's student products, configured, not customised." },
  PP: { name: "Microsoft 365 · Power Platform", part: "staff rack", team: "product", role: "The front for staff and faculty: Power Apps, Teams, automations." },
  AI: { name: "AI assistant", part: "agent terminal", team: "product", role: "Joins from year two, with its own identity." },
  PBI: { name: "Power BI", part: "reading desk", team: "product", role: "The front for leaders. It reads certified models only." },
  DOOR1: { name: "Door one · for work", part: "central exchange", team: "platform", role: "Brock's gateway: the one way in for apps, automations and AI agents. It also carries Brock's event feed." },
  WD: { name: "Workday", part: "HR station", team: "product", role: "HR and finance." },
  APPS: { name: "Brock's apps", part: "card-file station", team: "product", role: "Rebuilt BrockDB functions, such as Placements." },
  CAMPUS: { name: "Campus systems", part: "bank of four", team: "product", role: "LMS, library, housing, payments." },
  VENDOR: { name: "New vendor product", part: "new station", team: "product", role: "The accessibility-services product replacing OASIS." },
  DOOR2: { name: "Door two · for reports", part: "records cabinet", team: "platform", role: "Brock's data platform: one trusted copy of every system, with its history." },
  SIGNIN: { name: "One sign-in", part: "badge issuer", team: "platform", role: "Microsoft Entra ID for people, services and agents." },
  REGISTER: { name: "One register", part: "register printer", team: "platform", role: "An owner for every system, connection and report." },
  WATCH: { name: "Watched", part: "watch panel", team: "platform", role: "Every connection checked, vendor pipes too." },
  ARCHIVE: { name: "Secure archive", part: "safe", team: "platform", role: "BrockDB's history, kept as required." },
};

// Tubes are the visual's arrows. border: the tube passes through the bulkhead between
// Ellucian's plate and Brock's bench. vendor: a vendor-supplied pipe, registered and watched.
export const TUBES = {
  T1: { from: "EXP", to: "ETHOS" },
  T2: { from: "ETHOS", to: "BANNER" },
  T3: { from: "PP", to: "DOOR1" },
  T4: { from: "DOOR1", to: "ETHOS", border: true },
  T5: { from: "EXP", to: "DOOR1", border: true },
  T6: { from: "DOOR1", to: "WD" },
  T7: { from: "DOOR1", to: "APPS" },
  T8: { from: "DOOR1", to: "CAMPUS" },
  T9: { from: "DOOR1", to: "VENDOR" },
  T10: { from: "BANNER", to: "DOOR2", border: true },
  T11: { from: "WD", to: "DOOR2" },
  T12: { from: "APPS", to: "DOOR2" },
  T13: { from: "CAMPUS", to: "DOOR2" },
  T14: { from: "VENDOR", to: "DOOR2" },
  T15: { from: "DOOR2", to: "PBI" },
  T16: { from: "VENDOR", to: "CAMPUS", vendor: true },
  T17: { from: "AI", to: "DOOR1" },
};

// A hop: runs (tube ids; a leading "-" runs the tube backwards, a list in a list runs in
// parallel), then the stations and marks it lights. p: the principles that do the work here.
export const PATHS = [
  {
    id: "grade",
    title: "A grade change",
    sub: "Stays inside Ellucian's family",
    source: "Worked example from doc 10",
    principles: [2, 5],
    who: [["Builds", "A Brock product team, in Ellucian's workflow tool"], ["Owns", "The team owns the rules. Ellucian runs Ethos and Banner."]],
    hops: [
      { text: "A faculty member starts it from an Experience card.", at: ["EXP"], marks: ["card"] },
      { text: "Ellucian's workflow tool routes it to the Associate Dean.", runs: ["T1"], at: ["ETHOS"], marks: ["hold"], p: [5] },
      { text: "Only the approved outcome is written to Banner, through Ethos. Brock builds the workflow in Ellucian's tools, and nothing in Banner is customised.", runs: ["T2"], at: ["BANNER"], marks: ["dials"], p: [5] },
      { text: "Brock's platform only sees the result: a “grade changed” event on Brock's event feed.", runs: ["-T4"], at: ["DOOR1"], marks: ["bulkhead"], p: [2] },
      { text: "The event can trigger a Teams notice.", runs: ["-T3"], at: ["PP"], marks: ["teams"] },
      { text: "The change arrives in door two's copy, for reports.", runs: ["T10"], at: ["DOOR2"], marks: ["raw"] },
    ],
  },
  {
    id: "coop",
    title: "Co-op placements",
    sub: "A rebuilt BrockDB function on Brock's platform",
    source: "Worked example from doc 10",
    principles: [1, 2, 7, 8],
    who: [["Builds", "A product team, on Brock's platform"], ["Owns", "The app's owner, named in the register"]],
    note: "Custom connectors are a premium licence, so seat costs are priced before the app is approved.",
    hops: [
      { text: "Co-op staff work in a Power App.", at: ["PP"], marks: ["slot-coop"], p: [7] },
      { text: "It reads the student record through a connector generated from the Student API spec.", runs: ["T3"], at: ["DOOR1"], p: [1] },
      { text: "So it goes through door one and Ethos, and no maker ever holds a password.", runs: ["T4", "T2"], at: ["BANNER"], marks: ["bulkhead"], p: [2] },
      { text: "When a placement is confirmed, an event triggers a Teams approval.", runs: ["-T7", "-T3"], at: ["PP"], marks: ["teams"] },
      { text: "The student sees “My co-op placement” as an Experience card that calls the Placements API through door one.", runs: ["T5", "T7"], at: ["APPS"], marks: ["card", "bulkhead"], p: [7, 2] },
      { text: "The old BrockDB co-op screens are switched off.", at: ["ARCHIVE"], marks: ["coop-off"] },
      { text: "The app is in the register with an owner.", at: ["REGISTER"], marks: ["print"], p: [8] },
    ],
  },
  {
    id: "dean",
    title: "A Dean opens the enrolment dashboard",
    sub: "Door two",
    source: "From docs 15 and 22",
    principles: [1, 6],
    who: [["Builds", "The platform team runs door two"], ["Owns", "A named business owner for each certified model"]],
    hops: [
      { text: "Power BI reads a certified model, never Banner or any live database.", runs: ["T15"], at: ["PBI"], marks: ["certified"], p: [6, 1] },
      { text: "Door two copies Banner, Workday and Brock's apps into a raw layer that only pipelines touch.", runs: [["T10", "T11", "T12"]], at: ["DOOR2"], marks: ["raw"] },
      { text: "It then cleans the data into business entities.", at: ["DOOR2"], marks: ["entities"] },
      { text: "It certifies models, each with a named business owner.", at: ["DOOR2"], marks: ["certified", "owners"], p: [6] },
      { text: "The same question gets the same answer, and the catalog shows where every number came from.", at: ["DOOR2"], marks: ["catalog"] },
    ],
  },
  {
    id: "vendor",
    title: "A new vendor product arrives",
    sub: "The three-bucket test",
    source: "From docs 15 and 22",
    principles: [1, 3, 8],
    who: [["Builds", "The vendor supplies its own pipe. Anything else, Brock builds on door one."], ["Owns", "An owner for every connection, in the register"]],
    hops: [
      { text: "Take the accessibility-services product replacing OASIS.", at: ["VENDOR"] },
      { text: "If the connection is for reports, it goes through door two.", runs: ["T14"], at: ["DOOR2"], marks: ["raw"] },
      { text: "If the vendor supplies and supports the pipe between two named products, with a grant no wider than the job, it's registered and watched.", runs: ["T16"], at: ["CAMPUS"], marks: ["tag", "glass"], p: [3, 8] },
      { text: "That means an owner, a did-it-run check in Brock's log workspace, credentials with an owner and a rotation date, and a place in the release tests.", at: ["REGISTER", "WATCH"], marks: ["print", "lamp-T16"], p: [3, 8] },
      { text: "Anything else, Brock builds on door one.", runs: ["-T9"], at: ["DOOR1"], p: [1] },
      { text: "A direct database link is never allowed.", at: ["BANNER"], marks: ["seal"], p: [1] },
    ],
  },
  {
    id: "release",
    title: "Ellucian ships its quarterly Banner release",
    sub: "A pipeline run and a morning",
    source: "From docs 15 and 22",
    principles: [],
    who: [["Builds", "Ellucian ships the release"], ["Owns", "Product teams run the release tests"]],
    hops: [
      { text: "Releases can't be skipped, and there's a two-week test window.", at: ["BANNER"], marks: ["cartridge"] },
      { text: "The baseline tests written in the first ninety days run as the release test set, by pipeline.", runs: [["T1", "T2", "T4", "T10"]], at: ["WATCH"], marks: ["sweep"] },
      { text: "Each release then costs “a pipeline run and a morning”, not weeks of manual testing by the functional offices.", at: ["WATCH"], marks: ["all-lamps"] },
      { text: "Anything calling door one doesn't change, because APIs are versioned.", at: ["DOOR1"], marks: ["version"] },
      { text: "A change behind the door shows up as a version bump, not a rewrite.", at: ["DOOR1"], marks: ["version-bump"] },
    ],
  },
  {
    id: "dept",
    title: "A department wants an automation",
    sub: "The golden path",
    source: "From docs 15 and 22",
    principles: [1, 4, 8],
    who: [["Builds", "The department, to the maker standard"], ["Owns", "The department, with a retirement trigger"]],
    hops: [
      { text: "It gets an environment without raising a ticket, and builds to the maker standard.", at: ["PP"], marks: ["slot-dept"] },
      { text: "The data policy allows custom connectors only through the gateway and blocks the rest.", at: ["PP"], marks: ["caps"], p: [1] },
      { text: "It needs student data, so it uses the Student API connector, never a database login or a spreadsheet export.", runs: ["T3", "T4", "T2"], at: ["BANNER"], marks: ["bulkhead"], p: [1, 4] },
      { text: "It goes in the one register with an owner and a retirement trigger.", at: ["REGISTER"], marks: ["print"], p: [8] },
    ],
  },
  {
    id: "agent",
    title: "An AI assistant joins",
    sub: "From year two",
    source: "From docs 15 and 22",
    principles: [3, 4],
    who: [["Builds", "The platform team publishes the APIs it calls"], ["Identity", "Its own, with only the access it needs"]],
    hops: [
      { text: "It gets its own identity, with only the access it needs.", at: ["SIGNIN", "AI"], marks: ["badge"], p: [4] },
      { text: "It calls the same published APIs through door one.", runs: ["T17", "T7"], at: ["APPS"] },
      { text: "Every call carries its identity and a request ID.", at: ["REGISTER", "WATCH"], marks: ["print", "lamp-T17"], p: [3] },
      { text: "The guardrails are the same as for people.", at: ["DOOR1"], marks: ["reader"], p: [4] },
    ],
  },
];

export const ROLES = [
  { who: "Platform team", does: "Runs the doors, sign-in, the register and the watching as products. It publishes API specs, generates connectors, keeps the golden paths current, rotates credentials and watches the run checks.", test: "The test of success is that product teams never need a ticket." },
  { who: "Product teams", does: "Configure Banner and Workday, build on the golden paths, own their services and business rules, and run release tests." },
  { who: "Business owners", does: "Set priorities, sign off what each BrockDB function becomes, and own the numbers." },
  { who: "Ellucian", does: "Runs Banner and Ethos and ships releases. Brock registers and watches Ellucian's connectors." },
];

export const TODAY = ["Power BI reads BrockDB's production tables.", "Jobs connect straight into the database.", "There's no gateway and no register."];
export const AFTER = ["Every hop carries an identity and a request ID.", "Every connection has an owner.", "Banner is configured, not customised."];
export const ENDING = "About a full academic year after Banner's last go-live, the list of direct database connections reaches zero. BrockDB's history then moves to the archive, and its run costs come off the books.";

// Every tube a hop runs must exist, every station it lights too.
export function checkModel() {
  const problems = [];
  for (const path of PATHS)
    path.hops.forEach((hop, index) => {
      for (const run of (hop.runs ?? []).flat()) if (!TUBES[run.replace(/^-/, "")]) problems.push(`${path.id} hop ${index + 1}: no tube ${run}`);
      for (const at of hop.at ?? []) if (!STATIONS[at]) problems.push(`${path.id} hop ${index + 1}: no station ${at}`);
    });
  return problems;
}
