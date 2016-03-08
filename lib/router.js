'use strict';

const EventHandler = require('@scola/events');

class Router extends EventHandler {
  constructor(routes, providers) {
    super();

    this.routes = routes;
    this.providers = providers;

    this.defaults = new Map();
    this.targets = new Map();
    this.current = new Map();
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

  target(name, view, route) {
    this.targets.set(name, view);
    this.defaults.set(name, route);

    return this;
  }

  view(target) {
    const current = this.current.get(target);
    return current && current.view;
  }

  route(path, push) {
    const [name, ...parameters] = path.split(':');
    const [target] = name.split('.');
    const current = this.current.get(target) || {};

    if (path === current.path) {
      return this;
    }

    const route = this.getRoute(name);
    let view = null;

    switch (this.direction(current.path, path)) {
      case 'forward':
        view = route.forward(parameters);
        break;
      case 'backward':
        view = route.backward(parameters);
        break;
      case 'immediate':
        view = route.immediate(parameters);
        break;
    }

    this.current.set(target, {
      path,
      view
    });

    if (push !== false) {
      this.pushState();
    }

    return view;
  }

  destroy(path) {
    const [name] = path.split(':');
    const route = this.getRoute(name);

    route.destroy();
    return this.remove(route, false);
  }

  remove(route, push) {
    this.current.delete(route.getName().split('.')[0]);

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
        destroy.set(target, route.path);
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
      return result + '/' + route.path;
    }, '');
  }

  getRoute(name) {
    const definition = this.routes[name];

    return this.providers[definition.type]
      .get()
      .setName(name)
      .setView(definition.view)
      .setOptions(definition.options)
      .setRouter(this)
      .setTarget(this.targets.get(name.split('.')[0]));
  }
}

module.exports = Router;
