// Five cases of The Nordic Christmas Express (NORDVIA). Texts and car layouts only.
// Placements and clues are picked by scripts/generate.ts and stored in solutions.ts.
import type { Gender, Layout, Pred } from "../puzzle/engine";

export type CaseDef = {
  id: string;
  num: number;
  date: string; // opening day, YYYY-MM-DD
  dateLabel: string;
  wagon: string;
  title: string;
  segment: string;
  intro: string[];
  layout: Layout;
  suspects: string[]; // hero ids
  culprit: string;
  item: { name: string; gender: Gender; icon: string; img?: string; gen: string; ins: string };
  reveal: string[];
  evidence: string; // what goes to the notebook
  allow: Pred["t"][]; // clue types the generator may use
  pairs: boolean; // two-part clues allowed
  maxRel: number; // how many clues about other characters ("north of Mikko", "alone in her zone")
};

const ROZETKA = { ch: "O", name: "Socket", icon: "🔌", posture: "stand" as const, on: "at the socket", near: "next to the socket" };

export const CASES: CaseDef[] = [
  {
    id: "baggage",
    num: 1,
    date: "2026-12-21",
    dateLabel: "Dec 21, Mon",
    wagon: "Baggage Car",
    title: "Who Pulled the Plug?",
    segment: "Helsinki Central → Lahti",
    intro: [
      "Night, the first leg out of Helsinki. The baggage car carries the server with NORDVIA’s entire release of the year.",
      "At 01:12 monitoring turns red: the server is down. Someone pulled the cable — and the plug was left lying in the car.",
      "Four people were in the car. Find out who was alone in a zone with the plug.",
    ],
    layout: {
      n: 5,
      windows: false,
      regions: ["SSPPT", "SSPPT", "SSKKT", "KKKKT", "KKKKT"],
      objects: ["R.M..", ".O.H.", "R...O", "B.H..", "..B.."],
      zones: [
        { ch: "S", name: "Server corner", in: "in the server corner" },
        { ch: "P", name: "Mail bay", in: "in the mail bay" },
        { ch: "K", name: "Box storage", in: "in box storage" },
        { ch: "T", name: "Vestibule", in: "in the vestibule" },
      ],
      kinds: [
        { ch: "R", name: "Server rack", icon: "🗄️", blocked: true, posture: "stand", near: "next to the server rack" },
        { ch: "H", name: "Shelving", icon: "🧱", blocked: true, posture: "stand", near: "next to the shelving" },
        { ch: "M", name: "Mailbag", icon: "✉️", posture: "sit", on: "on the mailbag", near: "next to the mailbag" },
        { ch: "B", name: "Box", icon: "📦", posture: "sit", on: "on a box", near: "next to a box" },
        ROZETKA,
      ],
    },
    suspects: ["timur", "nika", "gleb", "sonya"],
    culprit: "timur",
    item: { name: "The plug", gender: "m", icon: "🔗", gen: "the plug", ins: "the plug" },
    reveal: [
      "Mikko. The DevOps engineer who was “just load-testing”.",
      "He pulled the cable on purpose: a secret test environment was running on the same server, and monitoring was about to reveal it to the whole train.",
      "In Mikko’s pocket there’s a note: “Not a word until 23:59. Pass the charger to Sofia.” What charger?",
    ],
    evidence: "Note: “Not a word until 23:59”",
    allow: ["on", "beside", "zone", "col", "row"],
    pairs: false,
    maxRel: 1,
  },
  {
    id: "platzkart",
    num: 2,
    date: "2026-12-22",
    dateLabel: "Dec 22, Tue",
    wagon: "Open-Plan Sleeper",
    title: "The Last USB-C Charger",
    segment: "Lahti → Savonlinna",
    intro: [
      "The open-plan sleeper is packed with the team. Laptops open, two days to release.",
      "There was a single USB-C charger for the whole car. By morning it was gone — and everyone was down to 3%.",
      "Five suspects, one charger. Who shared a zone with it?",
    ],
    layout: {
      n: 6,
      windows: true,
      regions: ["111222", "111222", "111222", "111222", "ППППТТ", "БББББТ"],
      objects: ["NtNNtN", "N.NVMV", "V.VN.N", ".O..G.", "....K.", "StSOS."],
      zones: [
        { ch: "1", name: "Bay 1", in: "in bay 1" },
        { ch: "2", name: "Bay 2", in: "in bay 2" },
        { ch: "П", name: "Aisle", in: "in the aisle" },
        { ch: "Б", name: "Side seats", in: "in the side seats" },
        { ch: "Т", name: "Coffee corner", in: "in the coffee corner" },
      ],
      kinds: [
        { ch: "N", name: "Lower berth", icon: "🛋️", posture: "sit", on: "on a lower berth", near: "next to a lower berth" },
        { ch: "V", name: "Upper berth", icon: "🛏️", posture: "lie", on: "on an upper berth", near: "under an upper berth" },
        { ch: "t", name: "Table", icon: "🍵", blocked: true, posture: "stand", near: "next to a table" },
        { ch: "M", name: "Bag of clementines", icon: "🍊", img: "tangerine", blocked: true, posture: "stand", near: "next to the clementines" },
        { ch: "G", name: "Kantele", icon: "🪕", blocked: true, posture: "stand", near: "next to the kantele" },
        { ch: "S", name: "Side seat", icon: "💺", posture: "sit", on: "on a side seat", near: "next to a side seat" },
        { ch: "K", name: "Coffee urn", icon: "☕", blocked: true, posture: "stand", near: "next to the coffee urn" },
        ROZETKA,
      ],
    },
    suspects: ["asya", "lev", "eva", "mark", "vera"],
    culprit: "asya",
    item: { name: "The charger", gender: "f", icon: "🔋", img: "battery", gen: "the charger", ins: "the charger" },
    reveal: [
      "Sofia. The product designer whose sticker-covered laptop is somehow always at 100%. Suspicious.",
      "All night the charger fed her laptop: Sofia was designing something huge, green and shimmering. She closed the mockup before anyone could take a proper look.",
      "The last screen of the mockup says: “Final sign-off — Lars, compartment 2.”",
    ],
    evidence: "A sticker with a corner of a green mockup",
    allow: ["on", "beside", "zone", "window", "notWindow", "col", "row", "corner"],
    pairs: true,
    maxRel: 2,
  },
  {
    id: "kupe",
    num: 3,
    date: "2026-12-23",
    dateLabel: "Dec 23, Wed",
    wagon: "Sleeper Car",
    title: "Who Approved Without Looking?",
    segment: "Savonlinna → Varkaus",
    intro: [
      "A ticket slipped into the release: now the “Plan journey” button routes every trip via the North Pole.",
      "Code review passed, the approval is there. But whose? In the morning someone found a cup labelled “LGTM” — the ice in it hadn’t melted yet.",
      "Even Tonttu, the AI assistant, is a suspect. He really wanted to help.",
    ],
    layout: {
      n: 6,
      windows: true,
      regions: ["112233", "112233", "112233", "112233", "ККККПП", "ККККПП"],
      objects: ["NtNtNt", "N.N.N.", "VZV.ZV", "...V..", ".F..F.", "..O..K"],
      zones: [
        { ch: "1", name: "Compartment 1", in: "in compartment 1" },
        { ch: "2", name: "Compartment 2", in: "in compartment 2" },
        { ch: "3", name: "Compartment 3", in: "in compartment 3" },
        { ch: "К", name: "Corridor", in: "in the corridor" },
        { ch: "П", name: "Attendant’s cabin", in: "in the attendant’s cabin" },
      ],
      kinds: [
        { ch: "N", name: "Lower berth", icon: "🛋️", posture: "sit", on: "on a lower berth", near: "next to a lower berth" },
        { ch: "V", name: "Upper berth", icon: "🛏️", posture: "lie", on: "on an upper berth", near: "under an upper berth" },
        { ch: "t", name: "Table", icon: "🍵", blocked: true, posture: "stand", near: "next to a table" },
        { ch: "Z", name: "Mirror", icon: "🪞", posture: "stand", on: "at the mirror", near: "next to the mirror" },
        { ch: "F", name: "Folding seat", icon: "🪑", posture: "sit", on: "on a folding seat", near: "next to a folding seat" },
        { ch: "K", name: "Kettle", icon: "🫖", blocked: true, posture: "stand", near: "next to the kettle" },
        ROZETKA,
      ],
    },
    suspects: ["mark", "nika", "gleb", "sonya", "kesha"],
    culprit: "mark",
    item: { name: "The LGTM cup", gender: "m", icon: "🥤", img: "drink", gen: "the LGTM cup", ins: "the LGTM cup" },
    reveal: [
      "Lars. The engineering lead with zero free slots somehow found one for an approval at 03:12.",
      "He didn’t read the code because he’d already seen it: the whole train had spent a week secretly building the same feature. The North Pole button was a decoy — rolled back in a minute.",
      "Under the cup: a time-zone diagram with Emma’s note — “check the timer in the restaurant car”.",
    ],
    evidence: "Time-zone diagram with Emma’s note",
    allow: ["on", "beside", "zone", "window", "notWindow", "notZone", "col", "row", "corner"],
    pairs: true,
    maxRel: 3,
  },
  {
    id: "restaurant",
    num: 4,
    date: "2026-12-24",
    dateLabel: "Dec 24, Thu",
    wagon: "Restaurant Car",
    title: "The 3 a.m. Push Notification",
    segment: "Varkaus → Kuopio",
    intro: [
      "At 03:00 every NORDVIA rider got a “Happy New Year!” push. A week early, and in the middle of the night.",
      "The train runs on Helsinki time, the server lives in UTC. Someone launched the campaign from the restaurant car.",
      "A napkin with a schedule was left on a table. Who was in the same zone as the napkin?",
    ],
    layout: {
      n: 6,
      windows: true,
      regions: ["ББЗЗЗЗ", "ББЗЗЗЗ", "ББЗЗЗЗ", "ББЗЗВВ", "ККККВВ", "ККККВВ"],
      objects: ["SXCTC.", ".X....", "SXCTC.", "S...ЁC", "П.K.CT", "..П.CT"],
      zones: [
        { ch: "Б", name: "Bar", in: "at the bar" },
        { ch: "З", name: "Dining hall", in: "in the dining hall" },
        { ch: "В", name: "Holiday table", in: "at the holiday table" },
        { ch: "К", name: "Kitchen", in: "in the kitchen" },
      ],
      kinds: [
        { ch: "S", name: "Bar counter", icon: "🍸", blocked: true, posture: "stand", near: "next to the bar counter" },
        { ch: "X", name: "Bar stool", icon: "🪩", posture: "sit", on: "on a bar stool", near: "next to a bar stool" },
        { ch: "C", name: "Chair", icon: "🪑", posture: "sit", on: "on a chair", near: "next to a chair" },
        { ch: "T", name: "Table with Christmas ham", icon: "🍖", img: "ham", blocked: true, posture: "stand", near: "next to a table" },
        { ch: "Ё", name: "Christmas tree", icon: "🎄", img: "xmastree", blocked: true, posture: "stand", near: "next to the Christmas tree" },
        { ch: "П", name: "Stove", icon: "🍳", blocked: true, posture: "stand", near: "next to the stove" },
        { ch: "K", name: "Coffee machine", icon: "☕", blocked: true, posture: "stand", near: "next to the coffee machine" },
      ],
    },
    suspects: ["eva", "timur", "asya", "lev", "vera"],
    culprit: "eva",
    item: { name: "The napkin", gender: "f", icon: "🧻", gen: "the napkin", ins: "the napkin" },
    reveal: [
      "Emma. The data analyst who has a dashboard even for this train.",
      "She was testing the New Year timer for the secret feature and forgot that the server counts in UTC while the train is on Helsinki time. The push was just a test. Honestly.",
      "In the corner of the napkin: “Timer ready. Leo presses the button. Locomotive, 23:59.”",
    ],
    evidence: "Napkin: “Leo presses the button”",
    allow: ["on", "beside", "zone", "window", "notWindow", "notZone", "notBeside", "col", "row", "corner"],
    pairs: true,
    maxRel: 3,
  },
  {
    id: "locomotive",
    num: 5,
    date: "2026-12-25",
    dateLabel: "Dec 25, Fri",
    wagon: "Locomotive & Command Car",
    title: "Deploy at 23:59",
    segment: "Kuopio → Rovaniemi",
    intro: [
      "One minute to New Year. One minute to production. Code freeze in 60 seconds.",
      "And then someone bypasses every rule and ships an unknown feature to production — from a laptop sitting right in the locomotive.",
      "Everyone from this week is here. The final case: who pressed the button?",
    ],
    layout: {
      n: 7,
      windows: true,
      regions: ["ККТТТСС", "ККТТТСС", "ККТТТСС", "ШШШШШШШ", "ЕЕЕУУУУ", "ЕЕЕУУУУ", "ЕЕЕУУУУ"],
      objects: ["PM.F.D.", ".....D.", "P.A...Y", ".......", "UU..D.D", "U.A..Y.", "....D.."],
      zones: [
        { ch: "К", name: "Driver’s cab", in: "in the driver’s cab" },
        { ch: "Т", name: "Boiler room", in: "in the boiler room" },
        { ch: "С", name: "Command room", in: "in the command room" },
        { ch: "Ш", name: "Gangway", in: "in the gangway" },
        { ch: "Е", name: "Tender", in: "in the tender" },
        { ch: "У", name: "Lounge", in: "in the lounge" },
      ],
      kinds: [
        { ch: "P", name: "Control panel", icon: "🎛️", blocked: true, posture: "stand", near: "next to the control panel" },
        { ch: "M", name: "Driver’s seat", icon: "💺", posture: "sit", on: "in the driver’s seat", near: "next to the driver’s seat" },
        { ch: "F", name: "Firebox", icon: "🔥", img: "fire", blocked: true, posture: "stand", near: "next to the firebox" },
        { ch: "D", name: "Sofa", icon: "🛋️", posture: "sit", on: "on a sofa", near: "next to a sofa" },
        { ch: "A", name: "Toolbox", icon: "🧰", posture: "sit", on: "on the toolbox", near: "next to the toolbox" },
        { ch: "Y", name: "Little fir tree", icon: "🌲", img: "fir", blocked: true, posture: "stand", near: "next to the little fir" },
        { ch: "U", name: "Coal pile", icon: "🪨", posture: "stand", on: "on the coal pile", near: "next to the coal" },
      ],
    },
    suspects: ["lev", "timur", "asya", "mark", "eva", "sonya"],
    culprit: "lev",
    item: { name: "The laptop", gender: "m", icon: "💻", gen: "the laptop", ins: "the laptop" },
    reveal: [
      "Leo. The intern who does everything for the first time. His first deploy ever — at 23:59 on December 31st.",
      "But he wasn’t alone. Mikko hid the test environment, Sofia designed it, Lars approved it, Emma checked the timer. The whole train spent a week building one feature together.",
      "Leo hits Enter. 00:00. On NORDVIA’s live map, right on the Arctic Circle by Rovaniemi, a giant Christmas tree lights up — and every route in Finland glows like the northern lights.",
    ],
    evidence: "A Christmas tree on the live map",
    allow: ["on", "beside", "zone", "window", "notWindow", "notZone", "notBeside", "col", "row", "corner"],
    pairs: true,
    maxRel: 4,
  },
];
