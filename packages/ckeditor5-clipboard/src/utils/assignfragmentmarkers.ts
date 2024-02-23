/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import {
	Range,
	type DocumentFragment,
	type Element,
	type Marker,
	type Writer
} from '@ckeditor/ckeditor5-engine';

function _extractCopyableMarkersInSelection( writer: Writer ) {
	const selection = writer.model.document.selection;
	const selectionRanges = Array.from( selection.getRanges()! );

	return selectionRanges
		.flatMap( selectionRange =>
			Array
				.from( writer.model.markers.getMarkersIntersectingRange( selectionRange ) )
				.filter( marker => marker.name.startsWith( 'comment:' ) )
		);
}

function _wrapCopyableMarkersWithFakeElements( writer: Writer, markers: Array<Marker> ) {
	const mappedMarkers = new Map<Marker, Array<Element>>();
	const sortedMarkers = markers
		.flatMap( marker => {
			const { start, end } = marker.getRange();

			return [
				{ position: start, marker },
				{ position: end, marker }
			];
		} )
		// Markers position is sorted backwards to ensure that the insertion of fake markers will not change
		// the position of the next markers.
		.sort( ( { position: posA }, { position: posB } ) => posA.isBefore( posB ) ? 1 : -1 );

	for ( const { position, marker } of sortedMarkers ) {
		const fakeMarker = writer.createElement( '$marker', { 'data-name': marker.name } );

		if ( !mappedMarkers.has( marker ) ) {
			mappedMarkers.set( marker, [] );
		}

		mappedMarkers.get( marker )!.push( fakeMarker );
		writer.insert( fakeMarker, position );
	}

	return mappedMarkers;
}

function _restoreAllFakeMarkersFromElement( writer: Writer, fragment: DocumentFragment ) {
	const fakeMarkerElements: Record<string, Array<Element>> = {};

	for ( const element of fragment.getChildren() ) {
		for ( const { item } of writer.createRangeOn( element ) ) {
			if ( !item.is( 'element' ) ) {
				continue;
			}

			const fakeMarkerName = item.getAttribute( 'data-name' ) as string | undefined;
			if ( !fakeMarkerName ) {
				continue;
			}

			( fakeMarkerElements[ fakeMarkerName ] ||= [] ).push( item );
		}
	}

	return fakeMarkerElements;
}

function _constructElementsMarkersRanges( writer: Writer, markers: Record<string, Array<Element>> ): Record<string, Range> {
	return Object
		.entries( markers )
		.reduce<Record<string, Range>>( ( acc, [ markerName, [ startElement, endElement ] ] ) => {
			const endPosition = writer.createPositionAt( endElement, 'before' );
			const endPath = [ ...endPosition.path ];

			// handle removal of end node which affects range end
			endPath[ endPath.length - 1 ]--;

			const range = new Range(
				writer.createPositionAt( startElement, 'before' ),
				writer.createPositionFromPath( endPosition.root, endPath )
			);

			acc[ markerName ] = range;
			return acc;
		}, { } );
}

export function beforeCopySelectionMarkersFragment( writer: Writer ): Map<Marker, Array<Element>> {
	const copyableMarkers = _extractCopyableMarkersInSelection( writer );

	return _wrapCopyableMarkersWithFakeElements( writer, copyableMarkers );
}

export function afterCopySelectionMarkersFragment(
	writer: Writer,
	documentFragment: DocumentFragment,
	insertedFakeMarkersElements: Map<Marker, Array<Element>>
): void {
	const fakeFragmentMarkersInMap = _restoreAllFakeMarkersFromElement( writer, documentFragment );
	const fakeMarkersRanges = _constructElementsMarkersRanges( writer, fakeFragmentMarkersInMap );

	for ( const [ marker, range ] of Object.entries( fakeMarkersRanges ) ) {
		documentFragment.markers.set( marker, range );
	}

	const allFakeMarkers = [
		...Array.from( insertedFakeMarkersElements.values() ).flat(),
		...Array.from( Object.values( fakeFragmentMarkersInMap ) ).flat()
	];

	for ( const element of allFakeMarkers ) {
		writer.remove( element );
	}
}
