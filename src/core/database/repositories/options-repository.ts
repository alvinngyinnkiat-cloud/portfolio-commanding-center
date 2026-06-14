import type { OptionsSettings, OptionsTrade } from "@/core/domain/types/options";

export interface OptionsTradeRepository {
  list(): OptionsTrade[];
  getById(id: string): OptionsTrade | null;
  append(trade: OptionsTrade): void;
  update(trade: OptionsTrade): void;
  remove(id: string): void;
}

export interface OptionsSettingsRepository {
  get(): OptionsSettings;
  save(settings: OptionsSettings): void;
}
