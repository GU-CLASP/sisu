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
    disliked_food: "food",
    booking_course: "course",
    booking_room: "room",
    booking_day: "day",
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    pizza: "food",
    sushi: "food",

    LT2319: "course",
    "Dialogue systems 2": "course",

    G212: "room",
    J440: "room",
    friday: "day",
    tuesday: "day",
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      plans: [
        { // We don’t need two plans with the same content. find_plan picks the first match, so the second won’t run. I
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            findout(WHQ("booking_day")),
            findout(WHQ("booking_course")),
            consultDB(WHQ("booking_room")),
          ],
          /*
          	•	How the steps tick forward:
	            1.	select_from_plan copies the first plan step to agenda.
	            2.	select_ask turns findout(Q) into a spoken question.
	            3.	user answers → integrate_answer adds a proposition to shared.com.
	            4.	remove_findout sees Q is resolved → pops that step.
	            5.	next step runs (another findout or consultDB).
	            6.	exec_consultDB adds the DB result to beliefs; select_answer turns relevant belief into a spoken answer.
          */
        },
      ],
    },
    database: {
      consultDB: (question, facts) => {
        if (objectsEqual(question, WHQ("booking_room"))) {
          const course  = getFactArgument(facts, "booking_course");
          const day     = getFactArgument(facts, "booking_day");
          if (course == "LT2319" && day?.toLowerCase() == "friday") {
            return { predicate: "booking_room", argument: "G212" };
          } else if (course == "LT2319" && day?.toLowerCase() == "tuesday") {
            return { predicate: "booking_room", argument: "J440" }
          };
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
    shared: { 
      lu: undefined, // When someone speaks, that turn's "moves" gets stored under : is.shared.lu.moves
      qud: [], 
      com: [] 
    }, 
  };
};
