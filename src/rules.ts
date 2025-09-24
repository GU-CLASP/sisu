import {
  Question,
  TotalInformationState,
  InformationState,
  Move,
  Action,
} from "./types";
import { relevant, resolves, combine } from "./semantics";
import { objectsEqual } from "./utils";

type Rules = {
  [index: string]: (
    context: TotalInformationState,
  ) => ((x: void) => InformationState) | undefined;
};

export const rules: Rules = {
  clear_agenda: ({ is }) => {
    return () => ({
      ...is,
      private: { ...is.private, agenda: [] },
    });
  },

  /**
   * Grounding
   */
  get_latest_move: (context) => {
    // Handle undefined or empty moves by creating a no_input move
    let moves: Move[] = context.latest_moves ?? [];
    if (moves.length === 0 || moves === undefined) {
      moves = [{ type: "no_input", content: null }];
    }
    
    return () => ({
      ...context.is,
      shared: {
        ...context.is.shared,
        lu: {
          moves: moves,
          speaker: context.latest_speaker ?? null,
        },
      },
    });
  },

  /**
   * Integrate
   */
  /** rule 5.1 */
  integrate_usr_request: ({ is }) => {
    if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves?.length) {
      for (const move of is.shared.lu.moves) {
        if (move.type === "request") {
          const action = move.content;
          for (const planInfo of is.domain.plans) {
            if (planInfo.type === "action" && planInfo.content === action) {
              return () => ({
                ...is,
                private: {
                  ...is.private,
                  agenda: planInfo.plan.concat(is.private.agenda),
                },
              });
            }
          }
        }
      }
    }
  },

  /** rule 2.2 */
  integrate_sys_ask: ({ is }) => {
    if (is.shared.lu?.speaker === "sys" && is.shared.lu.moves?.length) {
      for (const move of is.shared.lu.moves) {
        if (move.type === "ask") {
          const q = move.content;
          return () => ({
            ...is,
            shared: {
              ...is.shared,
              qud: [q, ...is.shared.qud],
            },
          });
        }
      }
    }
  },

  /** rule 2.3 */
  integrate_usr_ask: ({ is }) => {
    if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves?.length) {
      for (const move of is.shared.lu.moves) {
        if (move.type === "ask") {
          const question = move.content;
          const respondAction: { type: "respond"; content: Question } = {
            type: "respond",
            content: question,
          };
          return () => ({
            ...is,
            shared: {
              ...is.shared,
              qud: [question, ...is.shared.qud],
            },
            private: {
              ...is.private,
              agenda: [respondAction, ...is.private.agenda],
            },
          });
        }
      }
    }
  },

  /** rule 2.4 */
  integrate_answer: ({ is }) => {
    const topQUD = is.shared.qud[0];
    if (topQUD && is.shared.lu?.moves?.length) {
      for (const move of is.shared.lu.moves) {
        if (move.type === "answer") {
          const a = move.content;
          if (relevant(is.domain, a, topQUD)) {
            const proposition = combine(is.domain, topQUD, a);
            return () => ({
              ...is,
              shared: {
                ...is.shared,
                com: [proposition, ...is.shared.com],
              },
            });
          }
        }
      }
    }
  },

  /** rule 2.6 */
  integrate_greet: ({ is }) => {
    if (is.shared.lu?.moves?.length) {
      for (const move of is.shared.lu.moves) {
        if (move.type === "greet") {
          return () => ({
            ...is,
          });
        }
      }
    }
  },

  /** TODO rule 2.7 integrate_usr_quit */
  /** TODO rule 2.8 integrate_sys_quit */


  /** rule 3.x: handle negative system contact */
  // integrate_no_input: ({ is }) => {
  //   if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves?.length) {
  //     const hasNoInput = is.shared.lu.moves.some(move => move.type === "no_input");
  
  //     if (hasNoInput) {
  //       const topQuestion = is.shared.qud[0];
  
  //       // Increment counter
  //       const noInputCount = (is.private.no_input_count || 0) + 1;
  
  //       let nextMoves: Move[] = [];
  
  //       if (noInputCount >= 2) {
  //         // Provide answer from database if repeated silence
  //         const answer: Move = { type: "answer", content: is.private.bel[0] }; // simplistic
  //         nextMoves = [answer];
  //       } else {
  //         nextMoves = [{ type: "no_input", content: null }];
  //         if (topQuestion) nextMoves.push({ type: "ask", content: topQuestion });
  //       }
  
  //       return () => ({
  //         ...is,
  //         next_moves: [...is.next_moves, ...nextMoves],
  //         private: { ...is.private, no_input_count: noInputCount },
  //       });
  //     } else {
  //       // reset counter if user spoke
  //       return () => ({
  //         ...is,
  //         private: { ...is.private, no_input_count: 0 },
  //       });
  //     }
  //   }
  // },


  // LAB 2
  // integrate_no_input: ({ is }) => {
  //   console.log("[RULES DEBUG] integrate_no_input called");
  //   console.log("[RULES DEBUG] lu:", is.shared.lu);
    
  //   if (is.shared.lu?.speaker === "usr") {
  //     const hasNoInput = is.shared.lu.moves?.some(m => m.type === "no_input");
  //     console.log("[RULES DEBUG] hasNoInput:", hasNoInput);
      
  //     if (hasNoInput) {
  //       const topQuestion = is.shared.qud[0];
  //       console.log("[RULES DEBUG] topQuestion:", topQuestion);
        
  //       const nextMoves: Move[] = [{ type: "no_input", content: null }];
  //       if (topQuestion) nextMoves.push({ type: "ask", content: topQuestion });
        
  //       console.log("[RULES DEBUG] Setting next_moves:", nextMoves);
  //       return () => ({ ...is, next_moves: nextMoves });
  //     }
  //   }
    
  //   console.log("[RULES DEBUG] No no_input detected or not user speaker");
  // },

  /** rule 3.x: handle negative system contact */
  // integrate_no_input: ({ is }) => {
  //   if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves) {
  //     for (const move of is.shared.lu.moves) {
  //       if (move.type === "no_input") {
  //         return () => ({
  //           ...is,
  //           next_moves: [
  //             ...is.next_moves,
  //             { type: "no_input", content: null },
  //           ],
  //         });
  //       }
  //     }
  //   }
  // },
  integrate_no_input: ({ is }) => {
    // check once at top
    const hasNoInput =
      is.shared.lu?.speaker === "usr" &&
      is.shared.lu.moves?.some(m => m.type === "no_input");
  
    if (hasNoInput) {
      // increment counter
      const currentCount = is.private.no_input_count || 0;
      const newCount = currentCount + 1;
      const topQuestion = is.shared.qud[0];
  
      console.log("🔎 [NO_INPUT] Detected. Current count:", currentCount, "➡️ New count:", newCount);
  
      if (newCount < 3) {
        const nextMoves = [{ type: "no_input", content: null }];
        if (topQuestion) {
          nextMoves.push({ type: "ask", content: topQuestion });
        }
  
        return () => {
          const newState = {
            ...is,
            next_moves: [...(is.next_moves || []), ...nextMoves],
            private: {
              ...is.private,
              no_input_count: newCount
            }
          };
          console.log("✅ [NO_INPUT] Updating state. 🆕 no_input_count:", newState.private.no_input_count);
          return newState;
        };
      }
  
      // newCount >= 3: Provide answer instead of repeating question
      console.log("🎯 [NO_INPUT] Count >= 3, providing answer");
      
      let answerContent;
      let roomInfo = null;
  
      // Determine what to answer based on the current question
      if (topQuestion) {
        if (topQuestion.predicate === "booking_day") {
          // For "Which day?" question, provide a day and room info
          answerContent = "Friday";
          roomInfo = "G212"; // Room for Dialogue systems 2 on Friday
        } else if (topQuestion.predicate === "booking_course") {
          // For "Which course?" question, provide course and room info
          answerContent = "Dialogue systems 2";
          roomInfo = "G212"; // Default room
        }
      }
  
      const nextMoves = [{ type: "answer", content: answerContent }];
      
      // If we have room information, add it as an inform move
      if (roomInfo) {
        nextMoves.push({ 
          type: "inform", 
          content: `The room is ${roomInfo}` 
        });
      }
  
      return () => {
        const newState = {
          ...is,
          next_moves: nextMoves,
          shared: {
            ...is.shared,
            com: [answerContent, ...is.shared.com],
            qud: is.shared.qud.slice(1) // Remove answered question
          },
          private: {
            ...is.private,
            no_input_count: 0, // Reset counter
            agenda: [],
            plan: is.private.plan.slice(1) // Move to next question
          }
        };
        console.log("🎯 [NO_INPUT] Provided answer:", answerContent, "Room:", roomInfo);
        return newState;
      };
    }
  
    // ONLY reset counter if user provided REAL input (not unknown or system moves)
    const hasRealInput = 
      is.shared.lu?.speaker === "usr" && 
      is.shared.lu.moves?.some(m => 
        m.type === "ask" || m.type === "answer" || m.type === "request"
      );
  
    if (hasRealInput && (is.private.no_input_count || 0) > 0) {
      return () => {
        const newState = {
          ...is,
          private: {
            ...is.private,
            no_input_count: 0
          }
        };
        console.log("🔄 [NO_INPUT] Got real input – resetting counter back to 0");
        return newState;
      };
    }
  
    // nothing to do
    console.log("ℹ️ [NO_INPUT] No no_input detected, no changes applied");
    return undefined;
  },
  
  /** Task 2c: Provide answer after 3 no-input attempts */
  integrate_repeated_no_input: ({ is }) => {
    console.log("[DEBUG TASK 2C] integrate_repeated_no_input called");
    const hasNoInput = is.shared.lu?.speaker === "usr"
      && is.shared.lu.moves?.some(move => move.type === "no_input");
  
    if (hasNoInput) {
      const currentCount = is.private.no_input_count || 0;
      const newCount = currentCount + 1;
      console.log("[DEBUG TASK 2C] new count:", newCount);
  
      const topQuestion = is.shared.qud[0];
  
      if (newCount >= 3 && topQuestion) {
        // trigger answer and reset counter
        const answerContent = "Friday";
  
        return () => ({
          ...is,
          next_moves: [{ type: "answer", content: answerContent }],
          shared: {
            ...is.shared,
            com: [answerContent, ...is.shared.com],
            qud: is.shared.qud.slice(1)
          },
          private: {
            ...is.private,
            no_input_count: 0,
            agenda: [],
            plan: []
          }
        });
      } else {
        // <---- here’s the missing part:
        // increment the counter in the state even if we’re not answering yet
        return () => ({
          ...is,
          private: {
            ...is.private,
            no_input_count: newCount
          }
        });
      }
    }
  
    // no no_input move at all
    return undefined;
  },
  

  /** Task 3: Confidence-based grounding */
  integrate_low_confidence: ({ is }) => {
    if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves?.length) {
      // Handle both cases: with and without confidence field
      const lowConfidenceMoves = is.shared.lu.moves.filter(m => {
        // If confidence field exists and is low
        if (m.confidence && m.confidence < 0.7) return true;
        // If no confidence field, use default behavior (don't trigger)
        return false;
      });
      
      if (lowConfidenceMoves.length > 0) {
        const topQuestion = is.shared.qud[0];
        if (topQuestion) {
          return () => ({
            ...is,
            next_moves: [
              { type: "ask", content: topQuestion },
              { type: "inform", content: "I didn't quite catch that. Could you repeat?" }
            ]
          });
        }
      }
    }
  },
  
/** Task 3: Partial understanding feedback */
integrate_partial_understanding: ({ is }) => {
  if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves?.length) {
    const answerMoves = is.shared.lu.moves.filter(m => m.type === "answer");
    const topQuestion = is.shared.qud[0];
    
    // If user answered but it doesn't match expected format/values
    if (answerMoves.length > 0 && topQuestion) {
      const answer = answerMoves[0].content;
      
      // Check if answer is relevant but might need clarification
      if (relevant(is.domain, answer, topQuestion)) {
        // For booking_day question, check if answer is a valid day
        if (topQuestion.predicate === "booking_day") {
          const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
          if (typeof answer === "string" && !validDays.includes(answer.toLowerCase())) {
            return () => ({
              ...is,
              next_moves: [
                { type: "ask", content: topQuestion },
                { type: "inform", content: "Please specify a weekday (e.g., Monday, Tuesday, etc.)" }
              ]
            });
          }
        }
      }
    }
  }
},

/** Task 3: Positive grounding confirmation */
integrate_positive_grounding: ({ is }) => {
  if (is.shared.lu?.speaker === "usr" && is.shared.lu.moves?.length) {
    const answerMoves = is.shared.lu.moves.filter(m => m.type === "answer");
    
    // If user provided a clear answer with high confidence
    const highConfidenceMoves = answerMoves.filter(m => 
      (m as any).confidence && (m as any).confidence > 0.9
    );
    
    if (highConfidenceMoves.length > 0) {
      return () => ({
        ...is,
        next_moves: [
          ...is.next_moves,
          { type: "acknowledge", content: "Okay, got it." } // Positive feedback
        ]
      });
    }
  }
},


  


  /**
   * DowndateQUD
   */
  /** rule 2.5 */
  downdate_qud: ({ is }) => {
    const q = is.shared.qud[0];
    if (q) {
      for (const p of is.shared.com) {
        if (resolves(p, q)) {
          return () => ({
            ...is,
            shared: {
              ...is.shared,
              qud: [...is.shared.qud.slice(1)],
            },
          });
        }
      }
    }
  },

  /**
   * ExecPlan
   */
  /** rule 2.9 */
  find_plan: ({ is }) => {
    if (is.private.agenda.length > 0) {
      const action = is.private.agenda[0];
      if (action.type === "respond") {
        const question = action.content;
        for (const planInfo of is.domain.plans) {
          if (
            planInfo.type === "issue" &&
            objectsEqual(planInfo.content, question)
          ) {
            return () => ({
              ...is,
              private: {
                ...is.private,
                agenda: is.private.agenda.slice(1),
                plan: planInfo.plan,
              },
            });
          }
        }
      }
    }
  },

  /** rule 2.10 */
  remove_findout: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "findout") {
        const question = action.content as Question;
        for (const proposition of is.shared.com) {
          if (resolves(proposition, question)) {
            return () => ({
              ...is,
              private: {
                ...is.private,
                plan: is.private.plan.slice(1),
              },
            });
          }
        }
      }
    }
  },

  /** rule 2.11 */
  exec_consultDB: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "consultDB") {
        const question = action.content as Question;
        const propositionFromDB = is.database.consultDB(question, is.shared.com);
        if (propositionFromDB) {
          return () => ({
            ...is,
            private: {
              ...is.private,
              plan: is.private.plan.slice(1),
              bel: [...is.private.bel, propositionFromDB],
            },
          });
        }
      }
    }
  },

  /**
   * Select
   */
  /** rule 2.12 */
  select_from_plan: ({ is }) => {
    if (is.private.agenda.length === 0 && is.private.plan[0]) {
      const action = is.private.plan[0];
      return () => ({
        ...is,
        private: {
          ...is.private,
          agenda: [action, ...is.private.agenda],
        },
      });
    }
  },

  /** rule 2.13 */
  select_ask: ({ is }) => {
    if (is.private.agenda[0] && ["findout", "raise"].includes(is.private.agenda[0].type)) {
      const q = is.private.agenda[0].content as Question;
      let newIS = { ...is, next_moves: [...is.next_moves, { type: "ask", content: q }] };
      if (is.private.plan[0]?.type === "raise") {
        newIS.private = { ...is.private, plan: is.private.plan.slice(1) };
      }
      return () => newIS;
    }
  },

  /** rule 2.14 */
  select_respond: ({ is }) => {
    const topQUD = is.shared.qud[0];
    if (!topQUD) return;
    if (is.private.agenda.length === 0 && is.private.plan.length === 0) {
      for (const bel of is.private.bel) {
        if (!is.shared.com.some((x) => objectsEqual(x, bel)) && relevant(is.domain, bel, topQUD)) {
          const respondAction: Action = { type: "respond", content: topQUD };
          return () => ({
            ...is,
            private: { ...is.private, agenda: [respondAction, ...is.private.agenda] },
          });
        }
      }
    }
  },

  select_answer: ({ is }) => {
    if (is.private.agenda[0]?.type === "respond") {
      const question = is.private.agenda[0].content as Question;
      for (const bel of is.private.bel) {
        if (!is.shared.com.some((x) => objectsEqual(x, bel)) && relevant(is.domain, bel, question)) {
          const answerMove: Move = { type: "answer", content: bel };
          return () => ({
            ...is,
            next_moves: [...is.next_moves, answerMove],
          });
        }
      }
    }
  },

  /** handle greet and prepend no_input if user was silent */
  select_other: ({ is }) => {
    if (is.private.agenda[0]?.type === "greet") {
      return () => ({
        ...is,
        next_moves: [...is.next_moves, is.private.agenda[0] as Move],
      });
    }
  },
};