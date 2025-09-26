import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";

interface NLUMapping {
  [index: string]: Move[];
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "where is the lecture?": [{ //it has to do with the type, which is ask
    type: "ask",
    content: WHQ("booking_room"),
  }],
  "what's your favorite food?": [{ //it has to do with the type, which is ask
    type: "ask",
    content: WHQ("favorite_food"), //WHQ is a type of question that has a predicate
  }],
  "can you book me a course": [{
    type: "ask",
    content: WHQ("booking_course"),
  }],
  pizza: [{ //define answer objects
    type: "answer",
    content: "pizza",
  }],
  "dialogue systems 2": [{
    type: "answer",
    content: "LT2319",
  }],
  "dialogue systems": [{
    type: "answer",
    content: "LT2319",
  }],
  "friday": [{
    type: "answer",
    content: "friday",
  }],
  "tuesday": [{
    type: "answer",
    content: "tuesday",
  }],
  "G212": [{
    type: "answer",
    content: "G212",
  }],
  "J440": [{
    type: "answer",
    content: "J440",
  }],
};
const nlgMapping: NLGMapping = [
  [{ type: "neg_contact", content: null}, "I didn’t hear anything from you."],
  [{ type: "ask", content: WHQ("booking_course") }, "Which course?"],
  [{ type: "ask", content: WHQ("which_day") }, "Which day?"],
  [{ type: "answer", content: { predicate: "booking_room", argument: "J440" } },
    "The lecture is in J440.",
  ],
  [{ type: "answer", content: { predicate: "booking_room", argument: "G212" } },
    "The lecture is in G212.",
  ],
  
  [{ type: "greet", content: null }, "Hello! You can ask me anything!"],
  [{
      type: "answer",
      content: { predicate: "favorite_food", argument: "pizza" },
    },
    "Pizza.",
  ],
  [
    {
      type: "answer",
      content: { predicate: "booking_room", argument: "G212" },
    },
    "The lecture is in G212.",
  ],
];

export function nlg(moves: Move[]): string {
  console.log("generating moves", moves);

  // 🔹 helpers mínimos para fallback
  function realizeAsk(move: Move): string {
    const q: any = move.content;
    const p = (q?.predicate || "").toLowerCase();
    if (p === "booking_course") return "Which course?";
    if (p === "which_day" || p === "booking_day" || p === "day") return "Which day?";
    if (p === "booking_room" || p === "room") return "Which room?";
    return `Which ${p}?`;
  }
function realizeAnswer(move: Move): string {
    const c: any = move.content;
    if (typeof c === "string") {
      // nunca retorne vazio
      return c.length > 0 ? c : "Sorry, I don’t have an answer.";
    }
    const pred = (c?.predicate || "").toLowerCase();
    const arg = c?.argument ?? "";
    if (pred === "booking_room" || pred === "room" || pred === "location" || pred === "loc") {
      // ✅ frase que o teste espera
      return `The lecture is in ${arg}.`;
    }
    // fallback seguro
    return `${pred}: ${arg}`;
  }


  function generateMove(move: Move): string {
    const mapping = nlgMapping.find((x) => objectsEqual(x[0], move));
    if (mapping) {
      return mapping[1];
    }
       // 🔹 Fallbacks mínimos (mantendo sua lógica original como prioridade)
    if (move.type === "ask") return realizeAsk(move);
    if (move.type === "answer") return realizeAnswer(move);
    if (move.type === "greet") return "Hello! You can ask me anything!";
    if (move.type === "neg_contact") return "I didn’t hear anything from you.";
    if (move.type === "request") return (move.content as string) || "What would you like to know?";

    // Último recurso (não retornar string vazia)
    return "Sorry, I’m not sure.";
  }
  
  const utterance = moves.map(generateMove).join(' ');
  console.log("generated utterance:", utterance);
return utterance.length > 0 ? utterance : "I didn’t hear anything from you.";
}

/** NLU mapping function can be replaced by statistical NLU
 */
export function nlu(utterance: string): Move[] {
  const u = utterance.toLowerCase();
  if ( u === "*no_input*") return [];
  return nluMapping[u] || []; 
}
