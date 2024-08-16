import { WhQuestion, UpdateEvent, DMContext } from "./types";
import { assign, ActionFunction } from "xstate";

export const preconditions = ({
  context,
  event,
}: {
  context: DMContext;
  event: any;
}) => {
  switch ((event as UpdateEvent).value) {
    case "clear_agenda":
      return true;
    case "get_latest_move":
      return true;
    case "integrate_sys_greet": {
      if (
        context.is.shared.lu!.speaker === "sys" &&
        context.is.shared.lu!.move.type === "greet"
      ) {
        return true;
      }
      return false;
    }
    case "integrate_sys_ask": {
      if (
        context.is.shared.lu!.speaker === "sys" &&
        context.is.shared.lu!.move.type === "ask"
      ) {
        return true;
      }
      return false;
    }
    case "integrate_usr_ask": {
      if (
        context.is.shared.lu!.speaker === "usr" &&
        context.is.shared.lu!.move.type === "ask"
      ) {
        return true;
      }
      return false;
    }
    default:
      console.error("Precondition not implemented! Rule:", event.value);
  }
  return false;
};

export const effects: ActionFunction<
  DMContext,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
> = assign(({ context, event }) => {
  switch ((event as UpdateEvent).value) {
    case "clear_agenda": {
      const newIS = {
        ...context.is,
        private: {
          ...context.is.private,
          agenda: [],
        },
      };
      console.debug(`[ISU ${event.value}]`, newIS);
      return { is: newIS };
    }

    case "get_latest_move": {
      const newIS = {
        ...context.is,
        shared: {
          ...context.is.shared,
          lu: {
            move: context.latest_move!,
            speaker: context.latest_speaker!,
          },
        },
      };
      console.debug(`[ISU ${event.value}]`, newIS);
      return { is: newIS };
    }

    case "integrate_sys_greet": {
      const newIS = {
        ...context.is,
      };
      console.debug(`[ISU ${event.value}]`, newIS);
      return { is: newIS };
    }

    case "integrate_sys_ask": {
      const newIS = {
        ...context.is,
        shared: {
          ...context.is.shared,
          qud: [
            context.is.shared.lu!.move.content as WhQuestion,
            ...context.is.shared.qud,
          ],
        },
      };
      console.debug(`[ISU ${event.value}]`, newIS);
      return { is: newIS };
    }

    case "integrate_sys_ask": {
      const newIS = {
        ...context.is,
        shared: {
          ...context.is.shared,
          qud: [
            context.is.shared.lu!.move.content as WhQuestion,
            ...context.is.shared.qud,
          ],
        },
      };
      console.debug(`[ISU ${event.value}]`, newIS);
      return { is: newIS };
    }

    default:
      console.error("Effect not implemented! Rule:", event.value);
  }
  return { is: context.is };
});

//   resolve_top_qud: (c) => {
//     if (c.is.shared.lu) {
//       if (c.is.shared.lu.move.type === "answer" && c.is.shared.qud[0]) {
//         let q = c.is.shared.qud[0];
//         let r = c.is.shared.lu.move.content as string;
//         return {
//           guard: true,
//           effects: assign(({ context }: { context: DMContext }) => {
//             const newIS = {
//               ...context.is,
//               shared: {
//                 ...context.is.shared,
//                 com: [q(r), ...context.is.shared.com],
//               },
//             };
//             console.debug("[ISU resolve_top_qud]", newIS);
//             return { is: newIS };
//           }),
//         };
//       }
//     }
//     return { guard: false, effects: undefined };
//   },
// };
