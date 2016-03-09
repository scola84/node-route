const EventHandler = require('@scola/events');

class AbstractRoute extends EventHandler {
  constructor() {
    super();

    this.router = null;
    this.viewDispatcher = null;
  }

  getRouter() {
    return this.router;
  }

  setRouter(router) {
    this.router = router;
    return this;
  }

  getViewDispatcher() {
    return this.viewDispatcher;
  }

  setViewDispatcher(viewDispatcher) {
    this.viewDispatcher = viewDispatcher;
    return this;
  }

  view(name) {
    return this.viewDispatcher.get(name);
  }

  immediate() {
    throw new Error('not_implemented');
  }

  forward() {
    throw new Error('not_implemented');
  }

  backward() {
    throw new Error('not_implemented');
  }

  destroy() {
    throw new Error('not_implemented');
  }
}

module.exports = AbstractRoute;
