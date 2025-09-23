import { InformationState } from "./types";
import {
  objectsEqual,
  WHQ,
  findout,
  consultDB,
  getFactArgument,
} from "./utils";

export const initialIS = (): InformationState => {
  const predicates: { [index: string]: string } = {
    // Mapping from predicate to sort
    favorite_food: "food",
    booking_course: "course",
    booking_day: "day",
    booking_room: "room",  
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    pizza: "food",
    LT2319: "course",
    friday: "day",
    tuesday: "day",
    G212: "room",
    J440: "room",
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      plans: [
        {
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            findout(WHQ("booking_day")),
            findout(WHQ("booking_course")),
            consultDB(WHQ("booking_room")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts) => {
        if (objectsEqual(question, WHQ("booking_room"))) {
          const course = getFactArgument(facts, "booking_course");
          const day = getFactArgument(facts, "booking_day");

          if (course === "LT2319" && day === "friday") {
            return { predicate: "booking_room", argument: "G212" };
          }
          if (course === "LT2319" && day === "tuesday") {
            return { predicate: "booking_room", argument: "J440" };
          }
          return null;
        }
        return null;
      },
    },
    next_moves: [],
    private: {
      plan: [],
      agenda: [
        {
          type: "greet",
          content: null,
        },
      ],
      bel: [{ predicate: "favorite_food", argument: "pizza" }],
    },
    shared: { lu: undefined, qud: [], com: [] },
  };
};
