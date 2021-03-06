'use strict';

angular.module('mwComponentsBb', [])

  /**
   * @ngdoc directive
   * @name mwComponents.directive:mwFilterableSearch
   * @element div
   * @description
   *
   * Creates a search field to filter by in the sidebar. Search is triggered on keypress 'enter'.
   *
   * @param {filterable} filterable Filterable instance.
   * @param {expression} disabled If expression evaluates to true, input is disabled.
   * @param {string} property The name of the property on which the filtering should happen.
   */
  .service('ignoreKeyPress', function () {
    var ENTER_KEY = 13;
    return {
      ignoreEnterKey: function (event) {
        if (event.which === ENTER_KEY) {
          event.preventDefault();
        }
      }
    };
  })

  .directive('mwFilterableSearchBb', function ($timeout, ignoreKeyPress) {
    return {
      scope: {
        collection: '=',
        property: '@',
        customUrlParameter: '@',
        mwDisabled: '=',
        placeholder: '@'
      },
      templateUrl: 'uikit/templates/mwComponentsBb/mwFilterableSearch.html',
      link: function (scope, el) {
        var inputEl = el.find('input');

        var setFilterVal = function (val) {
          if (scope.customUrlParameter) {
            scope.collection.filterable.customUrlParams[scope.customUrlParameter] = val;
          } else {
            var filter = {};
            filter[scope.property] = val;
            scope.collection.filterable.setFilters(filter);
          }
        };

        scope.viewModel = {
          searchVal: ''
        };

        scope.search = function () {
          scope.searching = true;
          //backup searched text to reset after fetch complete in case of search text was empty
          setFilterVal(scope.viewModel.searchVal);
          return scope.collection.fetch().finally(function () {
            $timeout(function () {
              scope.searching = false;
            }, 500);
          });
        };

        scope.reset = function () {
          scope.viewModel.searchVal = '';
          scope.search();
        };

        scope.hasValue = function () {
          return inputEl.val().length > 0;
        };

        scope.keyUp = function (event) {
          ignoreKeyPress.ignoreEnterKey(event);
          scope.searching = true;
        };

        scope.focus = function () {
          inputEl.focus();
        };

        el.on('focus', 'input[type=text]', function () {
          el.children().addClass('is-focused');
        });

        el.on('blur', 'input[type=text]', function () {
          el.children().removeClass('is-focused');
        });
      }
    };
  })

  .directive('mwVersionSelector', function () {
    return {
      restrict: 'A',
      scope: {
        currentVersionModel: '=',
        versionCollection: '=',
        versionNumberKey: '@',
        url: '@'
      },
      templateUrl: 'uikit/templates/mwComponentsBb/mwVersionSelector.html',
      link: function (scope) {
        scope.versionNumberKey = scope.versionNumberKey || 'versionNumber';
        scope.getUrl = function (uuid) {
          return scope.url.replace('VERSION_UUID', uuid);
        };
      }
    };
  });




