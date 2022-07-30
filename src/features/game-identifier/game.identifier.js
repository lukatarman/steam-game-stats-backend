import {
  discoverGamesFromSteamWeb,
  updateIdentificationStatusSideEffectFree,
} from "./services/game.service.js";
import { Game } from "../../models/game.js";
import { delay } from "../../utils/time.utils.js";
import { HistoryCheck } from "../../models/history.check.js";

export class GameIdentifier {
  #steamClient;
  #databaseClient;
  #options;

  constructor(steamClient, databaseClient, options) {
    this.#steamClient = steamClient;
    this.#databaseClient = databaseClient;
    this.#options = options;
  }

  tryViaSteamWeb = async () => {
    const steamApps = await this.#databaseClient.getSteamWebUntriedFilteredSteamApps(
      this.#options.batchSize,
    );
    if (steamApps.length === 0) return;

    const [games, updatedSteamApps] = this.#identifyViaSteamWeb(steamApps);

    this.#persist(games, updatedSteamApps);
  };

  async #identifyViaSteamWeb(steamApps) {
    const htmlDetailsPages = this.#getSteamAppsHtmlDetailsPages(steamApps);

    const games = discoverGamesFromSteamWeb(steamApps, htmlDetailsPages);

    const updatedSteamApps = updateIdentificationStatusSideEffectFree(
      steamApps,
      htmlDetailsPages,
    );

    return [games, updatedSteamApps];
  }

  async #getSteamAppsHtmlDetailsPages(steamApps) {
    const detailsPages = [];
    for (let steamApp of steamApps) {
      detailsPages.push(
        await this.#steamClient.getSteamAppHtmlDetailsPage(steamApp.appid),
      );
      await delay(this.#options.unitDelay);
    }
    return detailsPages;
  }

  async #persist(games, updatedSteamApps) {
    if (games.length !== 0) {
      await this.#databaseClient.insertManyGames(games);
      await this.#databaseClient.insertManyHistoryChecks(
        HistoryCheck.manyFromGames(games),
      );
    }
    await this.#databaseClient.updateSteamAppsById(updatedSteamApps);
  }

  //todo: refactor identifyviaSteamchartsWeb

  tryViaSteamchartsWeb = async () => {
    const steamApps = await this.#databaseClient.getSteamchartsUntriedFilteredSteamApps(
      this.#options.batchSize,
    );
    if (steamApps.length === 0) return;

    const [games, updatedSteamApps] = await this.#identifyViaSteamchartsWeb(steamApps);

    this.#persist(games, updatedSteamApps);
  };

  async #identifyViaSteamchartsWeb(steamApps) {
    const games = [];
    const updatedSteamApps = [];

    for (let steamApp of steamApps) {
      await delay(this.#options.unitDelay);

      const copy = steamApp.copy();

      try {
        await this.#steamClient.getSteamchartsGameHtmlDetailsPage(steamApp.appid);
        games.push(Game.fromSteamApp(steamApp));
        copy.identify();
      } catch (error) {
        copy.tryViaSteamchartsWeb;
        updatedSteamApps.push(copy);
      }
    }

    return [games, updatedSteamApps];
  }
}
