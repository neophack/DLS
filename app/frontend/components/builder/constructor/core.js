'use strict';


angular.module('constructorCore', [
	'palette',
	'graph'
]);

var editorDefinition = {
	templateUrl: 'frontend/components/builder/constructor/core.html',
	controller: ConstructorController,
	bindings: {
	}
};

angular.module('constructorCore')
	.component('constructor', editorDefinition);

function ConstructorController($mdDialog, $rootScope) {

	this.$onInit = function() {
		$rootScope.$on('NetworkUpdated', function ($event, data) {
			console.log('NetworkUpdated')
		});

		$rootScope.$on('EditLayer', function ($event, data) {
			var parentEl = angular.element(document.body);
			var dialogTemplate = buildTemplate(data.id, data.layerType);
			$mdDialog.show({
				clickOutsideToClose: true,
				parent: parentEl,
				targetEvent: $event,
				template: dialogTemplate,
				locals: {},
				controller: DialogController
			});

			function DialogController($scope, $mdDialog) {
				$scope.closeDialog = function() {
					$mdDialog.hide();
				}
			}

			function buildTemplate(layerId, layerType) {
				var template =
					'<md-dialog>' +
					'  <md-dialog-content>'+
					'    <layer-editor layer-id="' + layerId + '" layer-type="' + layerType + '" do-on-submit="closeDialog()"></layer-editor>' +
					'  </md-dialog-content>' +
					'</md-dialog>';

				return template;
			}
		});
	};
}