angular.module('angularAppRoutes', ['ui.router'])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
  $stateProvider
  //splash page

  .state('splash', {
    url: '/splash',
    templateUrl: 'js/angular_views/splash.html'
  })
  .state('splash.nested', {
    url: '/nested',
    views: {
      'doodles': {
        template: '<h1>sakdjflkasjdfldjsaf</h1>'
      }
    }
  })

  .state('splashing', {
    url: '/splashing',
    templateUrl: 'js/angular_views/splashing.html'
  })

  .state('splashed', {
    url: '/splashed',
    templateUrl: 'js/angular_views/splashed.html'
  });
  $urlRouterProvider.otherwise('/angular_index.html');
}]);
