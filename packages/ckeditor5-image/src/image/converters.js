/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/image/converters
 */

import ModelPosition from '@ckeditor/ckeditor5-engine/src/model/position';
import ModelRange from '@ckeditor/ckeditor5-engine/src/model/range';
import first from '@ckeditor/ckeditor5-utils/src/first';

/**
 * Returns a function that converts the image view representation:
 *
 *		<figure class="image"><img src="..." alt="..."></img></figure>
 *
 * to the model representation:
 *
 *		<image src="..." alt="..."></image>
 *
 * The entire content of the `<figure>` element except the first `<img>` is being converted as children
 * of the `<image>` model element.
 *
 * @returns {Function}
 */
export function viewFigureToModel() {
	return ( evt, data, consumable, conversionApi ) => {
		// Do not convert if this is not an "image figure".
		if ( !consumable.test( data.input, { name: true, class: 'image' } ) ) {
			return;
		}

		// Do not convert if image cannot be placed in model at current position.
		if ( !conversionApi.schema.checkChild( data.position, 'image' ) ) {
			return;
		}

		// Find an image element inside the figure element.
		const viewImage = Array.from( data.input.getChildren() ).find( viewChild => viewChild.is( 'img' ) );

		// Do not convert if image element is absent, is missing src attribute or was already converted.
		if ( !viewImage || !viewImage.hasAttribute( 'src' ) || !consumable.test( viewImage, { name: true } ) ) {
			return;
		}

		// Convert view image to model image.
		const output = conversionApi.convertItem( viewImage, consumable, data.position );

		// Get image element from conversion output.
		const modelImage = first( output.getItems() );

		// Convert rest of the figure element's children as an image children.
		conversionApi.convertChildren( data.input, consumable, ModelPosition.createAt( modelImage ) );

		// Set model image as conversion result.
		data.output = ModelRange.createOn( modelImage );
	};
}

/**
 * Creates the image attribute converter for provided model conversion dispatchers.
 *
 * @param {Array.<module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher>} dispatchers
 * @param {String} attributeName
 * @param {Function} [converter] Custom converter for the attribute - default one converts attribute from model `image` element
 * to the same attribute in `img` in the view.
 */
export function createImageAttributeConverter( dispatchers, attributeName, converter = modelToViewAttributeConverter ) {
	for ( const dispatcher of dispatchers ) {
		dispatcher.on( `attribute:${ attributeName }:image`, converter() );
	}
}

/**
 * Converter used to convert `srcset` model image's attribute to `srcset`, `sizes` and `width` attributes in the view.
 *
 * @return {Function}
 */
export function srcsetAttributeConverter() {
	return ( evt, data, consumable, conversionApi ) => {
		const parts = evt.name.split( ':' );
		const consumableType = parts[ 0 ] + ':' + parts[ 1 ];
		const modelImage = data.item;

		if ( !consumable.consume( modelImage, consumableType ) ) {
			return;
		}

		const figure = conversionApi.mapper.toViewElement( modelImage );
		const img = figure.getChild( 0 );

		if ( data.attributeNewValue === null ) {
			const srcset = data.attributeOldValue;

			if ( srcset.data ) {
				img.removeAttribute( 'srcset' );
				img.removeAttribute( 'sizes' );

				if ( srcset.width ) {
					img.removeAttribute( 'width' );
				}
			}
		} else {
			const srcset = data.attributeNewValue;

			if ( srcset.data ) {
				img.setAttribute( 'srcset', srcset.data );
				// Always outputting `100vw`. See https://github.com/ckeditor/ckeditor5-image/issues/2.
				img.setAttribute( 'sizes', '100vw' );

				if ( srcset.width ) {
					img.setAttribute( 'width', srcset.width );
				}
			}
		}
	};
}

// Returns model to view image converter converting given attribute, and adding it to `img` element nested inside `figure` element.
//
// @private
function modelToViewAttributeConverter() {
	return ( evt, data, consumable, conversionApi ) => {
		const parts = evt.name.split( ':' );
		const consumableType = parts[ 0 ] + ':' + parts[ 1 ];
		const modelImage = data.item;

		if ( !consumable.consume( modelImage, consumableType ) ) {
			return;
		}

		const figure = conversionApi.mapper.toViewElement( modelImage );
		const img = figure.getChild( 0 );

		if ( data.attributeNewValue !== null ) {
			img.setAttribute( data.attributeKey, data.attributeNewValue );
		} else {
			img.removeAttribute( data.attributeKey );
		}
	};
}
