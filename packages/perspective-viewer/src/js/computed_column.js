/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */


import _ from 'underscore';
import {polyfill} from "mobile-drag-drop";

import {bindTemplate} from './utils.js';
import Computation from './computation.js';

import template from '../html/computed_column.html';

import '../less/computed_column.less';

polyfill({});

/******************************************************************************
 *
 * Drag & Drop Utils
 *
 */

// Called on end of drag operation by releasing the mouse
function column_undrag(event) {
   /* let data = event.target.parentElement.parentElement;
    if (this._visible_column_count() > 1 && event.dataTransfer.dropEffect !== 'move') {
        //this._input_column.removeChild(data);
        //this._update_column_view();
    }*/
    this._input_column.classList.remove('dropping');
}

// Called when the column leaves the target
function column_dragleave(event) {
    let src = event.relatedTarget;
    while (src && src !== this._input_column) {
        src = src.parentElement;
    }
    if (src === null) {
        // fixme this is bad
        this._input_column.classList.remove('dropping', 'dropped');
        this._drop_target_hover.removeAttribute('drop-target');
    }
}

// Called when column is held over the target
function column_dragover(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // todo type validation here
    if (event.currentTarget.className !== 'dropping') {
        event.currentTarget.classList.remove('dropped');
        event.currentTarget.classList.add('dropping');
    }
    if (!this._drop_target_hover.hasAttribute('drop-target')) {
        this._drop_target_hover.setAttribute('drop-target', true);
    }

    const input_column = this._input_column;

    if(input_column.children.length === 0) {
        // drop_target_hover is the blue box
        input_column.parentNode.insertBefore(this._drop_target_hover, input_column.nextSibling);
    }
}

// Called when the column is dropped on the target
function column_drop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('dropping');

    // column must match return type of computation
    const data = JSON.parse(ev.dataTransfer.getData('text'));
    if (!data) return;

    const column_name = data[0];
    const column_type = data[3];

    const computation = this._get_state().computation;
    if(column_type !== computation.return_type) return;

    if (this._input_column.children.length > 0) {
        this._input_column.innerHTML = '';
    }

    this._drop_target_hover.removeAttribute('drop-target');

    this.setAttribute('input_column', column_name);

    const event = new CustomEvent('perspective-computed-column-update', {
        detail: {
            name: column_name,
            type: column_type
        }
    });
    this.dispatchEvent(event);
}

const RETURN_TYPES = ['float', 'integer', 'string', 'boolean', 'date'];

const COMPUTATIONS = {
    'hour_of_day': new Computation('hour_of_day', 'date', () => new Date()),
    'alphabetical': new Computation('alphabetical', 'string', () => "abc"),
    'float_bucket': new Computation('float_bucket', 'float', () => 1.0),
    'true_false': new Computation('true_false', 'boolean', () => false),
};

@bindTemplate(template)
class ComputedColumn extends HTMLElement {
    constructor() {
        super();
    }

    // utils
    _get_state() {
        return {
            column_name: this.getAttribute('column_name'),
            computation: JSON.parse(this.getAttribute('computation')),
            input_column: this.getAttribute('input_column')
        };
    }

    _is_valid_state(state) {
        const values = _.values(state);
        return !values.includes(null) && !values.includes(undefined);
    }

    _clear_state() {
        this._column_name_input.value = '';
        this._input_column.innerHTML = '';
        this.setAttribute('column_name', '');
        this.setAttribute('input_column', '');
        this._update_computation(null);
    }

    _close_computed_column() {
        this.style.display = 'none';
        this._clear_state();
        this._side_panel_actions.style.display = 'flex';
    }

    // column_name
    _set_column_name() {
        const input = this._column_name_input;
        this.setAttribute('column_name', input.value);
    }

    // computation
    _update_computation(event) {
        const select = this._computation_selector;
        
        if(event === null) {
            select.selectedIndex = 0
        }

        const computation_name = select.options[select.selectedIndex].value;

        console.log(computation_name);

        const computation = COMPUTATIONS[computation_name];

        if (computation === undefined) {
            throw 'unknown computation!';
        }

        this._computation_type.classList.remove(...RETURN_TYPES);
        this._computation_type.classList.add(computation.return_type);

        this.setAttribute('computation', JSON.stringify(computation));
        this._input_column.innerHTML = '';
    }

    // column

    // save
    _validate_input() {

    }

    _save_computed_column() {
        const computed_column = this._get_state();

        if(!this._is_valid_state(computed_column)) {
            throw('invalid value!');
        }

        const event = new CustomEvent('perspective-computed-column-save', {
            detail: computed_column
        });

        this.dispatchEvent(event);
    }

    _register_ids() {
        this._side_panel_actions = document.querySelector('#side_panel__actions');
        this._close_button = this.querySelector('#psp-cc__close');
        this._column_name_input = this.querySelector('#psp-cc-name');
        this._computation_selector = this.querySelector('#psp-cc-computation__select');
        this._computation_type = this.querySelector('#psp-cc-computation__type');
        this._input_column = this.querySelector('#psp-cc-computation__input-column');
        this._drop_target_hover = this.querySelector('#psp-cc-computation__drop-target-hover');
        this._save_button = this.querySelector('#psp-cc-button-save');
        this._delete_button = this.querySelector('#psp-cc-button-delete');
    }

    _register_callbacks() {
        this._close_button.addEventListener('click', this._close_computed_column.bind(this));
        this._column_name_input.addEventListener('change', this._set_column_name.bind(this));
        this._computation_selector.addEventListener('change', this._update_computation.bind(this));
        this._input_column.addEventListener('drop', column_drop.bind(this));
        this._input_column.addEventListener('dragend', column_undrag.bind(this));
        this._input_column.addEventListener('dragover', column_dragover.bind(this));
        this._input_column.addEventListener('dragleave', column_dragleave.bind(this));
        this._save_button.addEventListener('click', this._save_computed_column.bind(this));
    }

    connectedCallback() {
        this._register_ids();
        this._register_callbacks();
        this._update_computation(null);
    }

    // call View.addComputedColumn through an eventListener
    // this.dispatchEvent(new Event('perspective-computed-column-update'));
}