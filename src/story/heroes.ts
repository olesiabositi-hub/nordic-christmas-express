// Heroes: fictional archetypes of NORDVIA's distributed product team. No real people.
import type { Gender } from "../puzzle/engine";

export type Hero = {
  id: string;
  name: string;
  role: string;
  gender: Gender;
  gen: string; // name as used inside a sentence: "north of Mikko"
  ins: string; // "in the same zone as Mikko"
  emoji: string;
  img: string; // mascot emoji key (see ui/emo.ts)
  color: string; // token colour on the board
  trait: string; // one characteristic detail
  from: string; // where they work from (distributed team)
};

export const HEROES: Hero[] = [
  { id: "nika", name: "Aino", role: "QA Engineer", gender: "f", gen: "Aino", ins: "Aino", emoji: "🔍", img: "eyes", color: "#FFC857", from: "Helsinki", trait: "Spots a bug even in a snowflake. Her eyes are her main tool." },
  { id: "timur", name: "Mikko", role: "DevOps", gender: "m", gen: "Mikko", ins: "Mikko", emoji: "🛠️", img: "fire", color: "#4C8DFF", from: "Tampere", trait: "Has been putting out production fires since 2019. Thermos the size of a server rack." },
  { id: "asya", name: "Sofia", role: "Product Designer", gender: "f", gen: "Sofia", ins: "Sofia", emoji: "🎨", img: "tulip", color: "#FF8A5B", from: "Lisbon", trait: "Laptop covered in stickers. Can see 2 extra pixels through a wall." },
  { id: "mark", name: "Lars", role: "Engineering Lead", gender: "m", gen: "Lars", ins: "Lars", emoji: "📅", img: "bell", color: "#7EE08A", from: "Stockholm", trait: "The meeting bell never stops. Not a single free slot in his calendar." },
  { id: "eva", name: "Emma", role: "Data Analyst", gender: "f", gen: "Emma", ins: "Emma", emoji: "📊", img: "sputnik", color: "#B9A2FF", from: "Berlin", trait: "There's a dashboard for everything. Even for satellites." },
  { id: "lev", name: "Leo", role: "Intern", gender: "m", gen: "Leo", ins: "Leo", emoji: "🌱", img: "go", color: "#3EE0B4", from: "Oulu", trait: "Does everything for the first time — and goes straight to “Ship it!”." },
  { id: "sonya", name: "Nora", role: "Product Manager", gender: "f", gen: "Nora", ins: "Nora", emoji: "🗂️", img: "heart", color: "#FF7EB6", from: "Oslo", trait: "Loves the product more than deadlines." },
  { id: "gleb", name: "Jonas", role: "Backend Engineer", gender: "m", gen: "Jonas", ins: "Jonas", emoji: "🖥️", img: "ghost", color: "#6CCFF6", from: "Tallinn", trait: "Works on his machine. A ghost bug lives in production." },
  { id: "vera", name: "Mia", role: "Mobile Developer", gender: "f", gen: "Mia", ins: "Mia", emoji: "📱", img: "arrow", color: "#FFE066", from: "Warsaw", trait: "Three phones, the journey planner open on all of them." },
  { id: "kesha", name: "Tonttu", role: "AI Assistant", gender: "m", gen: "Tonttu", ins: "Tonttu", emoji: "🤖", img: "ufo", color: "#A9B7C9", from: "the cloud", trait: "Named after the Finnish Christmas elf. Lives in a tablet. Slightly alien." },
];

export const hero = (id: string) => HEROES.find((h) => h.id === id)!;
