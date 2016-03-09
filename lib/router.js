'use strict';

const EventHandler = require('@scola/events');

class Router extends EventHandler {
  constructor(routes) {
    super();

    this.routes = routes;
    this.viewDispatcher = null;

    this.defaults = new Map();
    this.current = new Map();
  }

  getViewDispatcher() {
    return this.viewDispatcher;
  }

  setViewDispatcher(viewDispatcher) {
    this.viewDispatcher = viewDispatcher;
    return this;
  }

  start() {
    this.addHandlers();
    this.handlePopState();

    return this;
  }

  stop() {
    this.removeHandlers();
    return this;
  }

  route(path, push) {
    const [name, ...parameters] = path.split(':');
    const [target] = name.split('.');
    const current = this.current.get(target);

    if (path === current) {
      return this;
    }

    const route = this.getRoute(name);

    switch (this.direction(current, path)) {
      case 'forward':
        route.forward(parameters);
        break;
      case 'backward':
        route.backward(parameters);
        break;
      case 'immediate':
        route.immediate(parameters);
        break;
    }

    this.current.set(target, path);

    if (push !== false) {
      this.pushState();
    }

    return this;
  }

  destroy(path) {
    const [name] = path.split(':');

    this.getRoute(name).destroy();
    return this.remove(name, false);
  }

  remove(name, push) {
    this.current.delete(name.split('.')[0]);

    if (push !== false) {
      this.pushState();
    }

    return this;
  }

  addHandlers() {
    this.bindListener('popstate', window, this.handlePopState);
  }

  removeHandlers() {
    this.unbindListener('popstate', window, this.handlePopState);
  }

  default(name, route) {
    this.defaults.set(name, route);
    return this;
  }

  handlePopState() {
    const routes = new Map();
    const destroy = new Map();

    window.location.hash.substr(2).split('/').forEach((route) => {
      if (route && this.routes[route.split(':')[0]]) {
        routes.set(route.split('.')[0], route);
      }
    });

    this.current.forEach((route, target) => {
      if (!routes.has(target)) {
        destroy.set(target, route);
      }
    });

    this.defaults.forEach((route, target) => {
      if (route && !routes.has(target)) {
        routes.set(target, route);
        destroy.delete(target);
      }
    });

    destroy.forEach((route) => {
      this.destroy(route);
    });

    routes.forEach((route) => {
      this.route(route, false);
    });

    this.pushState();
  }

  pushState() {
    const state = this.stringify();

    if (state !== window.location.hash.substr(1)) {
      window.history.pushState(state, null, '#' + state);
    }
  }

  direction(current, next) {
    const [currentName] = current ? current.split(':') : [''];
    const [nextName] = next ? next.split(':') : [''];

    const currentParts = currentName.split('.');
    const nextParts = nextName.split('.');

    if (Math.abs(currentParts.length - nextParts.length) > 1) {
      return 'immediate';
    }

    if (this.contains(nextName, currentName)) {
      return 'forward';
    } else if (this.contains(currentName, nextName)) {
      return 'backward';
    }

    return 'immediate';
  }

  contains(outer, inner) {
    return inner && outer ?
      outer.substr(0, inner.length) === inner :
      false;
  }

  stringify() {
    return [...this.current.values()].reduce((result, route) => {
      return result + '/' + route;
    }, '');
  }

  getRoute(name) {
    return this.routes[name]
      .get()
      .setViewDispatcher(this.viewDispatcher)
      .setRouter(this);
  }
}

module.exports = Router;
