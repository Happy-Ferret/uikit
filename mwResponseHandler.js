/**
 * Created by zarges on 23/06/15.
 */
'use strict';
angular.module('mwResponseHandler', [])

  .provider('ResponseHandler', function () {

    var _routeHandlersPerMethodContainer = {
        POST: [],
        PUT: [],
        GET: [],
        DELETE: [],
        PATCH: []
      };

    var _methodIsInValidError = function(){
      return new Error('Method is invalid. Valid methods are POST, PUT, GET, DELETE, PATCH');
    };

    var RouteHandler = function (route) {

      var _codes = {
          ERROR: [],
          SUCCESS: []
        },
        _route = route,
        _routeRegex = null,
        _optionalParam = /\((.*?)\)/g,
        _namedParam = /(\(\?)?:\w+/g,
        _splatParam = /\*\w?/g,
        _escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;


      var _routeToRegExp = function (route) {
        route = route.replace(_escapeRegExp, '\\$&')
          .replace(_optionalParam, '(?:$1)?')
          .replace(_namedParam, function (match, optional) {
            return optional ? match : '([^/?]+)';
          })
          .replace(_splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
      };

      var _registerCallbackForCode = function (code, callback) {

        var existingCallbacks = _codes[code],
          callbacks = existingCallbacks || [];

        callbacks.push(callback);

        _codes[code] = callbacks;
      };

      var _getCallbackForCode = function (code) {
        return _codes[code];
      };

      this.matchesUrl = function (url) {
        return url.match(_routeRegex);
      };

      this.registerCallbackForStatusCodes = function (statusCodes, callback) {
        statusCodes.forEach(function (statusCode) {
          _registerCallbackForCode(statusCode, callback);
        }, this);
      };

      this.registerCallbackForSuccess = function (callback) {
        _registerCallbackForCode('SUCCESS', callback);
      };

      this.registerCallbackForError = function (callback) {
        _registerCallbackForCode('ERROR', callback);
      };

      this.getCallbacksForStatusCode = function (statusCode) {
        return _getCallbackForCode(statusCode);
      };

      this.getCallbacksForSuccess = function () {
        return _getCallbackForCode('SUCCESS');
      };

      this.getCallbacksForError = function () {
        return _getCallbackForCode('ERROR');
      };

      var main = function () {
        _routeRegex = _routeToRegExp(_route);
      };

      main.call(this);
    };

    this.registerAction = function (route, callback, options) {
      options = options || {};

      if (( options.onError && options.onSuccess ) || ( (options.onError || options.onSuccess) && options.statusCodes )) {
        throw new Error('Definition is too imprecise');
      }
      if (!options.method) {
        throw new Error('Method has to be defined in options e.g method: "POST"');
      }

      if (!_routeHandlersPerMethodContainer[options.method]) {
        throw _methodIsInValidError();
      }

      var existingRouteHandlerContainer = _.findWhere(_routeHandlersPerMethodContainer[options.method], {id: route}),
        routeHandlerContainer = existingRouteHandlerContainer || {id: route, handler: new RouteHandler(route)},
        routeHandler = routeHandlerContainer.handler;

      if (options.statusCodes) {
        routeHandler.registerCallbackForStatusCodes(options.statusCodes, callback);
      } else if (options.onSuccess) {
        routeHandler.registerCallbackForSuccess(callback);
      } else if (options.onError) {
        routeHandler.registerCallbackForError(callback);
      }

      if (!existingRouteHandlerContainer) {
        _routeHandlersPerMethodContainer[options.method].push(routeHandlerContainer);
      }

      return routeHandler;
    };

    this.registerSuccessAction = function (route, callback, method) {
      return this.registerAction(route, callback, {
        method: method,
        onSuccess: true
      });
    };

    this.registerErrorAction = function (route, callback, method) {
      return this.registerAction(route, callback, {
        method: method,
        onError: true
      });
    };

    this.$get = function ($injector) {

      var _executeCallback = function (callbacks, response) {
        callbacks.forEach(function (callback) {
          callback = angular.isString(callback) ? $injector.get(callback) : callback;
          callback.call(this, response);
        }, this);
      };

      return {
        getHandlerForUrl: function (method, url) {
          var _returnHandler;

          if (!_routeHandlersPerMethodContainer[method]) {
            throw _methodIsInValidError();
          }

          _routeHandlersPerMethodContainer[method].forEach(function (routeHandlerContainer) {
            var handler = routeHandlerContainer.handler;
            if (!_returnHandler && handler.matchesUrl(url)) {
              _returnHandler = handler;
            }
          });

          return _returnHandler;
        },
        handle: function (response, isError) {
          var url = response.config.url,
            method = response.config.method,
            statusCode = response.status,
            handler = this.getHandlerForUrl(method, url);

          if (handler) {
            var statusCodeCallback = handler.getCallbacksForStatusCode(statusCode);
            
            if (statusCodeCallback) {
              _executeCallback(statusCodeCallback, response);
            } else if (isError) {
              var isErrorCallback = handler.getCallbacksForError();
              _executeCallback(isErrorCallback, response);
            } else {
              var isSuccessCallback = handler.getCallbacksForSuccess();
              _executeCallback(isSuccessCallback, response);
            }
          }
        }
      };
    };
  })

  .config(function ($provide, $httpProvider) {

    $provide.factory('requestInterceptorForHandling', function (ResponseHandler) {
      return {
        response: function (response) {
          ResponseHandler.handle(response, false);
          return response;
        },
        responseError: function (response) {
          ResponseHandler.handle(response, true);
          return response;
        }
      };
    });

    $httpProvider.interceptors.push('requestInterceptorForHandling');

  });