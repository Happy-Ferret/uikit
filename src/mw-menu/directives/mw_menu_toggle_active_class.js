angular.module('mwUI.Menu')

  .directive('mwMenuToggleActiveClass', function ($rootScope, $location, $timeout) {
    return {
      scope: {
        entry: '=mwMenuToggleActiveClass'
      },
      link: function (scope, el) {
        var setIsActiveState = function () {
          $timeout(function () {
            var url = $location.url();

            if (scope.entry.hasActiveSubEntryOrIsActiveForUrl(url)) {
              el.addClass('active');
            } else {
              el.removeClass('active');
            }
          });
        };

        setIsActiveState();
        $rootScope.$on('$locationChangeSuccess', setIsActiveState);
        $rootScope.$on('$routeChangeError', setIsActiveState);
      }
    };
  });