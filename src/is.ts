import InformationState from "./types";
import { objectsEqual, WHQ } from "./utils";

export const initialIS = (): InformationState => {
  const predicates = { // Mapping from predicate to sort
    favorite_food: "food",
    booking_course: "course",
  };
  const individuals = { // Mapping from individual to sort
    pizza: "food",
    LT2319: "course",
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      relevant: (a, q) => {
        if (typeof a === "string" && predicates[q.predicate] === individuals[a]) {
          return true;
        }
        if (typeof a === "object" && q.predicate === a.predicate) {
          return true;
        }
        return false;
      },
      resolves: (a, q) => {
        if (typeof a === "object" && q.predicate === a.predicate) {
          return true;
        }
        return false;
      },
      plans: [
        {
          "type": "question",
          "content": WHQ("booking_room"),
          "plan": [
            {
              type: "findout",
              content: WHQ("booking_course"),
            },
            {
              type: "consultDB",
              content: WHQ("booking_room"),
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
