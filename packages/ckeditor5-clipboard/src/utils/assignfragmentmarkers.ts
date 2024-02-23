/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import {
	Range,
	type DocumentFragment,
	type Element,
	type Marker,
	type Writer,
	type DocumentSelection,
	type Selection
} from '@ckeditor/ckeditor5-engine';

function _getCopyableMarkersFromSelection( writer: Writer, selection: Selection | DocumentSelection ) {
	const selectionRanges = Array.from( selection.getRanges()! );

	return selectionRanges
		.flatMap( selectionRange =>
			Array
				.from( writer.model.markers.getMarkersIntersectingRange( selectionRange ) )
				.filter( marker => marker.name.startsWith( 'comment:' ) )
		);
}

function _insertFakeMarkersElements( writer: Writer, markers: Array<Marker> ) {
	const mappedMarkers = new Map<Marker, Array<Element>>();
	const sortedMarkers = markers
		.flatMap( marker => {
			const { start, end } = marker.getRange();

			return [
				{ position: start, marker, type: 'start' },
				{ position: end, marker, type: 'end' }
			];
		} )
		// Markers position is sorted backwards to ensure that the insertion of fake markers will not change
		// the position of the next markers.
		.sort( ( { position: posA }, { position: posB } ) => posA.isBefore( posB ) ? 1 : -1 );

	for ( const { position, marker, type } of sortedMarkers ) {
		const fakeMarker = writer.createElement( '$marker', {
			'data-name': marker.name,
			'data-type': type
		} );

		if ( !mappedMarkers.has( marker ) ) {
			mappedMarkers.set( marker, [] );
		}

		mappedMarkers.get( marker )!.push( fakeMarker );
		writer.insert( fakeMarker, position );
	}

	return mappedMarkers;
}

function _getAllFakeMarkersFromElement( writer: Writer, fragment: DocumentFragment ) {
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

function _removeFakeMarkersFromFragment(
	writer: Writer,
	markers: Record<string, Array<Element>>,
	documentFragment: DocumentFragment
): Record<string, Range> {
	return Object
		.entries( markers )
		.reduce<Record<string, Range>>( ( acc, [ markerName, [ startElement, endElement ] ] ) => {
			if ( !endElement ) {
				// <fake-marker> [ phrase</fake-marker> phrase ]
				//   ^
				// handle case when marker is just before start of selection
				if ( startElement.getAttribute( 'data-type' ) === 'end' ) {
					const endPosition = writer.createPositionAt( startElement, 'before' );
					const startPosition = writer.createPositionFromPath( endPosition.root, [ 0 ] );

					writer.remove( startElement );
					acc[ markerName ] = new Range( startPosition, endPosition );
				}

				// [<fake-marker>phrase]</fake-marker>
				//                           ^
				// handle case when fake marker is after selection
				if ( startElement.getAttribute( 'data-type' ) === 'start' ) {
					const startPosition = writer.createPositionAt( startElement, 'before' );
					writer.remove( startElement );

					const endPosition = writer.createPositionAt( documentFragment, 'end' );
					acc[ markerName ] = new Range( startPosition, endPosition );
				}

				return acc;
			}

			const startPosition = writer.createPositionAt( startElement, 'before' );
			writer.remove( startElement );

			const endPosition = writer.createPositionAt( endElement, 'before' );
			writer.remove( endElement );

			acc[ markerName ] = new Range( startPosition, endPosition );
			return acc;
		}, { } );
}

export function beforeCopySelectionMarkersFragment(
	writer: Writer,
	selection: Selection | DocumentSelection = writer.model.document.selection
): Map<Marker, Array<Element>> {
	const copyableMarkers = _getCopyableMarkersFromSelection( writer, selection );
	const fakeMarkersElements = _insertFakeMarkersElements( writer, copyableMarkers );

	return fakeMarkersElements;
}

export function afterCopySelectionMarkersFragment(
	writer: Writer,
	documentFragment: DocumentFragment,
	insertedFakeMarkersElements: Map<Marker, Array<Element>>
): void {
	const fakeFragmentMarkersInMap = _getAllFakeMarkersFromElement( writer, documentFragment );
	const fakeMarkersRanges = _removeFakeMarkersFromFragment(
		writer,
		fakeFragmentMarkersInMap,
		documentFragment
	);

	for ( const [ marker, range ] of Object.entries( fakeMarkersRanges ) ) {
		documentFragment.markers.set( marker, range );
	}

	for ( const element of Array.from( insertedFakeMarkersElements.values() ).flat() ) {
		writer.remove( element );
	}
}
