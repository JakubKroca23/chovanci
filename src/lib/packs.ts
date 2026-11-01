import type { SituationPack } from "./types";

export const SITUATION_PACKS: {
  id: SituationPack;
  label: string;
  hint: string;
}[] = [
  { id: "mix", label: "Mix", hint: "Všechny situace" },
  { id: "prace", label: "Práce", hint: "Meetingy, deadliny, Slack" },
  { id: "rodina", label: "Rodina", hint: "Večeře, group chat, povinnosti" },
  { id: "patek", label: "Pátek", hint: "Večírek, afterparty, sobotní ráno" },
];

export function packLabel(pack: SituationPack): string {
  return SITUATION_PACKS.find((p) => p.id === pack)?.label ?? pack;
}
