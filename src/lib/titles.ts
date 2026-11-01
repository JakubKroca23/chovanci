import { getCard } from "./cards";

export function finaleTitle(winnerName: string, winningCardId: string): string {
  return `Největší ${getCard(winningCardId).name} večera: ${winnerName}`;
}
