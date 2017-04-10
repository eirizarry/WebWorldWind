/*
 * Copyright (C) 2017 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports WKTObject
 */
define([
    '../../../geom/Location',
    '../../../geom/Position',
    '../WKTElements',
    '../WKTType'
], function (Location,
             Position,
             WKTElements,
             WKTType) {
    /**
     * THis shouldn't be initiated from outside. It is only for internal use. Every other WKT Objects are themselves
     * WKTObject
     * @param type {String} Textual representation of the type of current object.
     * @constructor
     */
    var WKTObject = function (type) {
        /**
         * Type of this object.
         * @type {WKTType}
         */
        this.type = type;

        /**
         * It is possible for the WKT object to be displayed not in 2D but in 3D.
         * @type {Boolean}
         * @private
         */
        this._is3d = false;

        /**
         * It is possible for
         * @type {boolean}
         * @private
         */
        this._isLrs = false;

        /**
         *
         * @type {Position[]|Location[]}
         */
        this.coordinates = [];

        this.options = {
            coordinates: [],
            leftParenthesis: 0,
            rightParenthesis: 0
        };
    };

    /**
     * It sets the information that this object is actually represented in 3D
     */
    WKTObject.prototype.set3d = function () {
        this._is3d = true;
    };

    /**
     * It sets the information that the object contain information about LRS offset.
     */
    WKTObject.prototype.setLrs = function () {
        this._isLrs = true;
    };

    /**
     * Array containing latitude, longitude and potentially either altitude or LRS.
     * @coordinates {Number[]} Array containing longitude, latitude and potentially altitude of another point in the
     *  object.
     */
    WKTObject.prototype.addCoordinates = function (coordinates) {
        if (this._is3d) {
            this.coordinates.push(new Position(coordinates[0], coordinates[1], coordinates[2] || 0));
        } else {
            this.coordinates.push(new Location(coordinates[0], coordinates[1]));
        }
    };

    /**
     * It is used to retrieve and create the shape or shapes associated.
     * @returns {Renderable[]} Array of renderables associated with given shape.
     */
    WKTObject.prototype.shapes = function() {
        return [];
    };

    /**
     * Token handling is delegated to the objects.
     * @param token {Object} It contains type and value.
     */
    WKTObject.prototype.handleToken = function(token) {
        var value = token.value;
        var options = this.options;
        if (token.type === WKTType.TokenType.TEXT) {
            // In this part retain only the information about new Object?
            this.text(options, value);
        } else if (token.type === WKTType.TokenType.LEFT_PARENTHESIS) {
            options.leftParenthesis++;
        } else if (token.type === WKTType.TokenType.RIGHT_PARENTHESIS) {
            options.rightParenthesis++;

            this.rightParenthesis(options);
        } else if (token.type === WKTType.TokenType.NUMBER) {
            this.number(options, value);
        } else if (token.type === WKTType.TokenType.COMMA) {
            this.comma(options);
        }
    };

    /**
     * There are basically three types of tokens in the Text line. The name of the type for the next shape, Empty
     * representing the empty shape and M or Z or MZ expressing whether it is in 3D or whether Linear Referencing System
     * should be used.
     * @private
     * @param options {}
     * @param value {String} Value to use for distinguishing among options.
     */
    WKTObject.prototype.text = function(options, value) {
        value = value.toUpperCase();
        var started = null;
        if (value.length <= 2) {
            this.setOptions(value, this);
        } else if (value.indexOf('EMPTY') === 0) {
            this.options.leftParenthesis = 1;
            this.options.rightParenthesis = 1;
        } else {
            var founded = value.match('[M]?[Z]?$');

            if(founded && founded.length > 0 && founded[0] != '') {
                this.setOptions(founded, started);
            }

            // Handle the GeometryCollection.
            var currentObject = WKTElements[value] && new WKTElements[value]();
            if(!currentObject) {
                currentObject = new WKTObject();
            }

            if(founded && founded.length > 0 && founded[0] != '') {
                currentObject.setOptions(founded[0], currentObject);
            }
            this.add(currentObject);
        }
    };

    /**
     * Right parenthesis either end coordinates for an object or ends current shape.
     * @private
     * @param options
     */
    WKTObject.prototype.rightParenthesis = function(options) {
        if (options.coordinates) {
            this.addCoordinates(options.coordinates);
            options.coordinates = null;
        }
    };

    /**
     * Comma either means another set of coordinates, or for certain shapes for example another shape or just another
     * boundary
     * @private
     * @param options
     */
    WKTObject.prototype.comma = function(options) {
        if (!options.coordinates) {
            this.commaWithoutCoordinates();
        } else {
            this.addCoordinates(options.coordinates);
            options.coordinates = null;
        }
    };

    /**
     * Used by Multi objects to delineate the internal objects. This is default implementation doing nothing.
     */
    WKTObject.prototype.commaWithoutCoordinates = function(){};

    /**
     * Handle Number by adding it among coordinates in the current object.
     * @private
     * @param options
     * @param value {Number}
     */
    WKTObject.prototype.number = function(options, value) {
        options.coordinates = options.coordinates || [];
        options.coordinates.push(value);
    };

    /**
     * It sets the options of the current object. This means setting up the 3D and the linear space.
     * @param text
     * @param currentObject
     */
    WKTObject.prototype.setOptions = function(text, currentObject) {
        if (text == 'Z') {
            currentObject.set3d();
        } else if (text == 'M') {
            currentObject.setLrs();
        } else if (text == 'MZ') {
            currentObject.set3d();
            currentObject.setLrs();
        }
    };

    /**
     * It returns true when the object is finished.
     * @return {Boolean}
     */
    WKTObject.prototype.isFinished = function() {
        return this.options.leftParenthesis === this.options.rightParenthesis && this.options.leftParenthesis > 0;
    };

    return WKTObject;
});