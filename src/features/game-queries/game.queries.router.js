export class GameQueriesRouter {
  #controller;

  constructor(gameQueriesController) {
    this.#controller = gameQueriesController;
  }

  routes = async (server, options) => {
    server.get("/games", async (request, reply) => {
      const limit = request.query.limit ? request.query.limit : 10;

      if (request.query.sort) return await this.#controller.getTopXgames(parseInt(limit));

      return await this.#controller.getAllGames();
    });

    server.get("/games/:id", async (request, reply) => {
      const id = parseInt(request.params.id);

      return await this.#controller.getOneGameById(id);
    });

    server.get("/search", async (request, reply) => {
      const term = request.query.q;

      return await this.#controller.getGameBySearchTerm(term);
    });
  };
}
