/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

export default class Computation {
    constructor(name, return_type, body) {
        this.name = name;
        this.return_type = return_type;
        this.body = body.toString();
    }
}