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

    // LAB 1
    booking_day: "day",        // NEW
    booking_room: "room"       // probably already implicit

  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    pizza: "food",
    LT2319: "course",

    // LAB 1
    friday: "day",             // NEW
    tuesday: "day"             // NEW

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

            // findout(WHQ("booking_course")),
            // consultDB(WHQ("booking_room")),

            // LAB 1
            // ask for day first
            findout(WHQ("booking_day")),
            // then ask for course
            findout(WHQ("booking_course")),
            // then consult DB
            consultDB(WHQ("booking_room")),

          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts) => {
        if (objectsEqual(question, WHQ("booking_room"))) {
          const course = getFactArgument(facts, "booking_course");
        //   if (course == "LT2319") {
        //     return { predicate: "booking_room", argument: "G212" };
        //   }
        // }

          // LAB 1
          const day = getFactArgument(facts, "booking_day");
          if (course == "LT2319" && day == "friday") {
            return { predicate: "booking_room", argument: "G212" };
          }
          if (course == "LT2319" && day == "tuesday") {
            return { predicate: "booking_room", argument: "J440" };
          }
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
      last_no_input: false,            // <-- NEW flag
      no_input_count: 0,
    },
    
    // shared: { lu: undefined, qud: [], com: [] },

    // LAB 1
    shared: { lu: { moves: [] }, qud: [], com: [] },
    
  };
};
