'use strict';


function DataImporterService ($http) {

    let table = null;

    this.createTable = function () {
        let types = null;
        table = new DataTable(types);
        this.getDataSetTypes().then(
            function success(response) {

                console.log(response.data);
                types = response.data.column;
                table.setSupportedTypes(types);
            },
            function error(response) {
                console.log(response.data);
            }
        );

        return table;
    };

    this.getTable = function () {
        return table;
    };


    this.getDataSetMetadataInRange = function (path, header, separator, rows) {
        return $http({
            method: 'POST',
            url:    '/dataset/csv/load/rows',
            params: {
                'file-path':       path,
                header:     header,
                separator:    separator,
                'rows-num': rows
            }
        });
    };

    this.getDataSetTypes = function () {
        return $http({
            method: 'GET',
            url:    '/dataset/data/types/config'
        });
    };

}

const types = new Map();
const typesNames = [];


class DataTable {

    static get columnTypes () {
        let types = new Map([
            ['image2d', {
                headerClass: HeaderItem,
                cellClass: CellItem
            }],
            ['number', {
                headerClass: NumberHeaderItem,
                cellClass: NumberCellItem
            }],
            ['string', {
                headerClass: HeaderItem,
                cellClass: CellItem
            }],
            ['string1', {
                headerClass: HeaderItem,
                cellClass: CellItem
            }]
        ]);
        return types;
    }

    static get types () {
        return types;
    }

    constructor(/*path, header, delimiter*/) {
        this.headers = [];
        this.rows = [];
        this.selectedColumnIndexes = [];
        this.config = {
            filePath: null,
            header: null,
            threads: 1,
            delimiter: ','
        };
    }

    get supportedTypes() {
        return typesNames;
    }


    setSupportedTypes(types) {
        types.forEach(function (item) {
            if (!DataTable.types.has(item.type)) {
                DataTable.types.set(item.type, item);
                typesNames.push(item.type);
            }
        });
    }

    setDelimiter(delimiter) {
        this.config.delimiter = delimiter;
    }

    setThreadsCount(threads) {
        this.config.threads = threads;
    }

    getConfig() {
        let config = {
            name: '',
            threads: this.config.threads,
            transforms: {
                csv_file_path: this.config.filePath,
                header: this.config.header,
                delimiter: this.config.delimiter,
                columns: []
            }
        };

        for (let header of this.headers) {
            let hd = {
                name: header.name,
                type: header.type,
                columns: header.columns
            };
            config.transforms.columns.push(hd);
        }

        return config;
    }

    applyConfig(config) {
        this.config = {
            filePath: config.transforms.csv_file_path,
            header: config.transforms.header,
            threads: config.threads,
            delimiter: config.transforms.delimiter
        };

        this.selectedColumnIndexes.length = 0;

        for (let column of config.transforms.columns) {
            this.selectedColumnIndexes = column;
            this.mergeColumns();
        }
        this.selectedColumnIndexes.length = 0;
    }

    createHeader(headerSize, headerNames) {
        for (let index = 0; index < headerSize; ++index) {
            let name = headerNames ? headerNames[index]: null;
            let type = this.supportedTypes[0];
            let Header = this.headerClassByType(type);
            let header = new Header(this.config.header, type, index, name);
            this.addColumn(header);
        }

    }

    addStringRow(row) {
        let CellItemString = this.cellClassByType('string');
        let rowItem = new RowItem();

        for (let cell of row) {
            rowItem.addCell(new CellItemString('string', cell));
        }
        this.addRow(rowItem);
    }

    loadFromCsv(data, header) {

        this.config.header=header;
        this.createHeader(data[0].length, header ? data[0] : null);

        for (let a = 1; a < data.length; ++a) {
            this.addStringRow(data[a]);
        }
    }

    headerClassByType(type) {
        /*let types = DataTable.columnTypes;
        if (types.has(type))
            return types.get(type).headerClass;*/

        return HeaderItem;
    }

    cellClassByType(type) {
        let types = DataTable.columnTypes;
        if (types.has(type)) {
            return types.get(type).cellClass;
        }
    }

    addColumn(header) {
        this.headers.push(header);

        for (let row of this.rows) {
            row.addCell(new (types.get(header.type).cellClass)(header.type));
        }
    }

    addRow(row) {
        this.rows.push(row)
    }

    addRows(rows) {
        this.rows.push(rows)
    }

    checkColumn(header) {
        let headerIndex = this.headers.indexOf(header);
        if (headerIndex > -1) {
            let index = this.selectedColumnIndexes.indexOf(headerIndex);
            if (index < 0)
                this.selectedColumnIndexes.push(headerIndex);
            else this.selectedColumnIndexes.splice(index, 1);
        }
    }

    mergeColumns() {
        if (this.selectedColumnIndexes.length < 2)
            return;

        let destIndex = this.selectedColumnIndexes[0];
        let destHeaderItem = this.headers[this.selectedColumnIndexes[0]];
        destHeaderItem.selected = false;

        let srcIndexes = this.selectedColumnIndexes.slice(1, this.selectedColumnIndexes.length);
        for(let header of srcIndexes) {
            destHeaderItem.mergeWith(this.headers[header]);
        }

        for(let row of this.rows) {
            row.mergeCells(destIndex, srcIndexes);
        }
        this.selectedColumnIndexes.length = 0;
        this.removeColumns(srcIndexes);
    }

    removeColumn(index) {
        this.headers.splice(index, 1);
        for(let row of this.rows) {
            row.cells.splice(index, 1);
        }
    }

    removeColumns(indexes) {
        if (!indexes)
            indexes = this.selectedColumnIndexes;
        let counter = 0;
        for (let index of indexes) {
            this.removeColumn(index - counter++);
        }
        this.selectedColumnIndexes.length = 0;
    }
}

class HeaderItem {

    constructor(visible, type, index, name) {
        this.type = type;
        this.name = name;
        this.selected = false;
        this.template = null;
        this.visible = visible;
        this.columns = [index];

        this.buildTemplate();
    }

    getTemplate() {
        return this.template;
    }

    buildTemplate() {

        console.log(DataTable.types);
        console.log(this.type);
        let params = DataTable.types.get(this.type);
        console.log(params);

        let settingsTemplate = '';
        if (params.transforms) {
            for (let param of params.transforms) {
                console.log(param);
                for (let elem in param.config) {
                    console.log(elem);
                    if (param.config[elem].input === 'list') {
                        settingsTemplate += buildList(param.config[elem], elem);
                    } else if (param.config[elem].input === 'int') {
                        settingsTemplate += buildInteger(param.config[elem], elem);
                    }

                }
            }
        }


        this.template = `
            <md-dialog aria-label=${this.name}>
                <form ng-cloak>
                    <md-toolbar>
                        <div class="md-toolbar-tools">
                        <h2>Settings - ${this.name}</h2>
                        <span flex></span>
                        <md-button class="md-icon-button" ng-click="cancel()">
                        <md-icon>close</md-icon>
                        </md-button>
                        </div>
                    </md-toolbar>
                    <md-dialog-content  layout="column">
                        ${settingsTemplate}
                    </md-dialog-content>
                    <md-dialog-actions layout="row">
                        <md-button ng-click="ok()" md-autofocus>
                            Применить
                        </md-button>
                        <span flex></span>
                    </md-dialog-actions>
                
                <form ng-cloak>
            </md-dialog>
        `;
    }

    toString() {
        return this.name + `(${this.type})`;
    }

    mergeWith(item) {
        this.columns = this.columns.concat(item.columns);

        // this.name += ', ' + item.name;
    }

    controller() {
        let self = this;

        return function ($scope, $mdDialog) {
            $scope.data = self.params;
            $scope.ok = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.hide();
            };
        };
    }

    set changeType(type) {
        this.type = type;
        this.buildTemplate();
        console.log(type);
    }

}

class CellItem {

    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    getTitle() {
        return this.value;
    }

    toString() {
        return this.getTitle();
    }

    mergeWith(cell) {
        this.value += ', ' + cell.value;
    }
}

class RowItem {

    constructor(cells = []) {
        this.cells = cells;
    }

    addCell(cell) {
        this.cells.push(cell);
    }

    addCells(cells) {
        this.cells.push(cells);
    }

    getCell(index = 0) {
        if (this.cells.length <= index)
            return;

        return this.cells[index];
    }

    mergeCells(destIndex, srcIndexes) {
        if (typeof destIndex !== 'number' || !Array.isArray(srcIndexes))
            return;

        let destCell = this.cells[destIndex];

        for(let cell of srcIndexes) {
            destCell.mergeWith(this.cells[cell]);
        }
    }

}

class NumberHeaderItem extends HeaderItem {

    constructor(name) {
        super('number', name);

    }

    mergeWith(item) {
        this.name += ' + ' + item.name;
    }
}

class NumberCellItem extends CellItem {

    constructor(value) {

        super('number', value);
    }

    getTitle() {
        return this.value;
    }

    toString() {
        return this.getTitle();
    }

    mergeWith(cell) {
        this.value += cell.value;
    }
}


function buildList(list, name) {
    let template = `
        <md-input-container style="margin: 10px;">
            <label>${list.name}</label>
            <md-select ng-model="data.${name}.value" aria-label="favoriteColor">
                <md-option ng-click="selected()" ng-value="item" ng-repeat="item in data.${name}.list">{{item}}</md-option>
             </md-select>
        </md-input-container>
        `;
    return template;
}

function buildInteger(obj, name) {
    let template = `
        <md-input-container>
            <label>${obj.name}</label>
            <input ng-model="data.${name}.value" type="number" required>
        </md-input-container>
     `;
    return template;
}