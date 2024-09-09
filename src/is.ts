import InformationState from "./types";
import { objectsEqual} from "./utils";

export const initialIS = (): InformationState => {
  const predicates = {
    favorite_food: "food",
    booking_course: "course",
  };
  const individuals = {
    pizza: "food",
    LT2319: "course",
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      relevant: (a, q) => {
        if (typeof a === "string" && predicates[q(a).predicate] === individuals[a]) {
          return true;
        }
        if (typeof a === "object" && q(a).predicate === a.predicate) {
          return true;
        }
        return false;
      },
      resolves: (a, q) => {
        if (typeof a === "object" && q(a).predicate === a.predicate) {
          return true;
        }
        return false;
      },
      plans: [
        {
          "type": "question",
          "content": (x) => ({"predicate": "booking_room", "argument": x}),
          "plan": [
            {
              type: "findout",
              content: (x) => ({"predicate": "booking_course", "argument": x}),
            },
            {
              type: "consultDB",
              content: (x) => ({"predicate": "booking_room", "argument": x}),
            },
          ],
        }
      ],
    },
    database: {
      consultDB: (question, facts) => {
        return {"predicate": "booking_room", "argument": "G212"}
      }
    },
    next_move: null,
    private: {
      plan: [],
      agenda: [
        {
          type: "greet",
          content: null,
        },
      ],
      bel: [{"predicate": "favorite_food", "argument": "pizza"}],
    },
    shared: { lu: undefined, qud: [], com: [] },
  }
};
