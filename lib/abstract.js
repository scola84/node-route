const EventHandler = require('@scola/events');

class AbstractRoute extends EventHandler {
  constructor() {
    super();

    this.name = null;
    this.view = null;
    this.target = null;
    this.router = null;
    this.options = null;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  getView() {
    return this.view;
  }

  setView(view) {
    this.view = view;
    return this;
  }

  getTarget() {
    return this.target;
  }

  setTarget(target) {
    this.target = target;
    return this;
  }

  getRouter() {
    return this.router;
  }

  setRouter(router) {
    this.router = router;
    return this;
  }

  setOptions(options) {
    this.options = options;
    return this;
  }

  getOptions() {
    return this.options;
  }

  destroy() {
    this.target
      .view(this.getView().split('.')[0])
      .destroy();
  }

  handleDestroy() {
    this.router.remove(this);
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
}

module.exports = AbstractRoute;
