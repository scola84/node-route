'use strict';

const EventHandler = require('@scola/events');

class Router extends EventHandler {
  constructor(routes) {
    super();

    this.routes = routes;
    this.viewDispatcher = null;

    this.defaults = new Map();
    this.current = new Map();
    this.scripts = new Map();
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

  setDefault(name, route) {
    this.defaults.set(name, route);
    return this;
  }

  addRoutes(routes) {
    Object.assign(this.routes, routes);
    return this;
  }

  addScript(name, file) {
    this.scripts.set(name, {
      file,
      loaded: false
    });

    return this;
  }

  loadScript(namespace) {
    const script = this.scripts.get(namespace);

    if (!script || script.loaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      script.loaded = true;
      this.scripts.set(namespace, script);

      const element = document.createElement('script');

      element.setAttribute('type', 'text/javascript');
      element.setAttribute('src', script.file);

      element.onload = resolve;
      element.onerror = reject;

      document.head.appendChild(element);
    });
  }

  route(path, push) {
    const next = this.getDefinition(path);
    const current = this.current.get(next.target);

    if (current && next.route === current.route) {
      return Promise.resolve(this);
    }

    return this
      .loadScript(next.namespace)
      .then(this.handleLoad.bind(this, next, push));
  }

  handleLoad(next, push) {
    const current = this.current.get(next.target);
    const route = this.getRoute(next.route);

    switch (this.direction(current, next)) {
      case 'forward':
        route.forward(next.parameters);
        break;
      case 'backward':
        route.backward(next.parameters);
        break;
      case 'immediate':
        route.immediate(next.parameters);
        break;
    }

    this.current.set(next.target, next);

    if (push !== false) {
      this.pushState();
    }

    return this;
  }

  destroy(path) {
    const definition = this.getDefinition(path);
    this.getRoute(definition.route).destroy();

    return this.remove(path, false);
  }

  remove(path, push) {
    const definition = this.getDefinition(path);
    this.current.delete(definition.target);

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

    window.location.hash.substr(2).split('/').forEach((path) => {
      const definition = this.getDefinition(path);

      if (definition &&
        this.routes[definition.route] ||
        this.scripts.has(definition.namespace)) {
        routes.set(definition.target, path);
      }
    });

    this.current.forEach((current) => {
      if (!routes.has(current.target)) {
        destroy.set(current.target, current.path);
      }
    });

    this.defaults.forEach((path, target) => {
      if (!routes.has(target)) {
        routes.set(target, path);
        destroy.delete(target);
      }
    });

    destroy.forEach((path) => {
      this.destroy(path);
    });

    [...routes.values()].reduce((promise, path) => {
      return promise.then(() => this.route(path, false));
    }, Promise.resolve()).then(() => this.pushState());
  }

  pushState() {
    const state = this.stringify();

    if (state !== window.location.hash.substr(1)) {
      window.history.pushState(state, null, '#' + state);
    }
  }

  direction(current, next) {
    if (!current || Math.abs(current.name.length - next.name.length) > 1) {
      return 'immediate';
    }

    if (this.contains(next.name, current.name)) {
      return 'forward';
    } else if (this.contains(current.name, next.name)) {
      return 'backward';
    }

    return 'immediate';
  }

  contains(outer, inner) {
    return inner && outer ?
      outer.slice(0, inner.length).join() === inner.join() :
      false;
  }

  stringify() {
    let result = '';

    this.current.forEach((current) => {
      result += '/' + current.path;
    });

    return result;
  }

  getDefinition(path) {
    const parts = path.split('@');
    const [route] = path.split(':');
    const [nameString, parameters] = parts[1] ? parts[1].split(':') : [''];
    const name = ('@' + nameString).split('.');
    const namespace = name.slice(0, 2).join('.');
    const target = parts[0] || namespace;

    return {
      name,
      namespace,
      parameters,
      path,
      route,
      target
    };
  }

  getRoute(name) {
    return this.routes[name]
      .get()
      .setViewDispatcher(this.viewDispatcher)
      .setRouter(this);
  }
}

module.exports = Router;
