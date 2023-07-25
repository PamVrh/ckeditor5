/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* global btoa */

import TokenMock from '@ckeditor/ckeditor5-cloud-services/tests/_utils/tokenmock';
import { getWorkspaceIds, getImageUrls, getImageUrls2 } from '../src/utils';

describe( 'utils', () => {
	let token;

	beforeEach( async () => {
		token = await createToken( { auth: { ckbox: { workspaces: [ 'workspace1' ] } } } );
	} );

	describe( 'getWorkspaceIds()', () => {
		it( 'should return workspace ids from a token', async () => {
			const token = await createToken( {
				aud: 'environment',
				auth: {
					ckbox: {
						workspaces: [ 'workspace1', 'workspace2' ]
					}
				}
			} );

			expect( getWorkspaceIds( token ) ).to.deep.equal( [ 'workspace1', 'workspace2' ] );
		} );

		it( 'should return environment name as a workspace id from a token when `auth.ckbox.workspaces` is missing', async () => {
			const token = await createToken( {
				aud: 'environment',
				auth: {
					ckbox: {}
				}
			} );

			expect( getWorkspaceIds( token ) ).to.deep.equal( [ 'environment' ] );
		} );

		it( 'should return environment name as a workspace id from a token when `auth.ckbox` is missing', async () => {
			const token = await createToken( {
				aud: 'environment',
				auth: {}
			} );

			expect( getWorkspaceIds( token ) ).to.deep.equal( [ 'environment' ] );
		} );

		it( 'should return environment name as a workspace id from a token when `auth` is missing', async () => {
			const token = await createToken( {
				aud: 'environment'
			} );

			expect( getWorkspaceIds( token ) ).to.deep.equal( [ 'environment' ] );
		} );

		it( 'should return environment name as a workspace id from a token when `auth.ckbox.workspaces` is empty', async () => {
			const token = await createToken( {
				aud: 'environment',
				auth: {
					ckbox: {
						workspaces: []
					}
				}
			} );

			expect( getWorkspaceIds( token ) ).to.deep.equal( [ 'environment' ] );
		} );
	} );

	function createToken( claims ) {
		const initialToken = [
			// Header.
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
			// Payload.
			btoa( JSON.stringify( claims ) ),
			// Signature.
			'signature'
		].join( '.' );

		return TokenMock.create( () => Promise.resolve( initialToken ) );
	}

	describe( 'getImageUrls() - TODO', () => {
		const testData = [
			{ maxWidth: 80, widths: [ 80 ], extension: 'jpg' },
			{ maxWidth: 80, widths: [ 80 ], extension: 'png' },
			{ maxWidth: 400, widths: [ 80, 160, 240, 320, 400 ], extension: 'jpg' },
			{ maxWidth: 200, widths: [ 80, 120, 200 ], extension: 'png' }
		];

		for ( const { maxWidth, widths, extension } of testData ) {
			it( `should create responsize image source definition from the response data - ${ maxWidth }.${ extension }`, () => {
				const data = {
					default: getExampleUrl( maxWidth, extension )
				};

				for ( const width of widths ) {
					data[ width ] = getExampleUrl( width );
				}

				const expectedSizes = `(max-width: ${ maxWidth }px) 100vw, ${ maxWidth }px`;
				const expectedSrcset = widths.map( width => `${ getExampleUrl( width ) } ${ width }w` ).join( ',' );

				expect( getImageUrls2( data ) ).to.deep.equal( {
					imageFallbackUrl: getExampleUrl( maxWidth, extension ),
					imageSources: [ {
						sizes: expectedSizes,
						srcset: expectedSrcset,
						type: 'image/webp'
					} ]
				} );
			} );
		}

		function getExampleUrl( width, extension = 'webp' ) {
			return `https://example.com/workspace1/assets/foo-id/images/${ width }.${ extension }`;
		}
	} );

	describe( 'getImageUrls()', () => {
		it( 'should create responsive image source definition and image fallback URL - width: 100, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 100, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/100.png',
				imageSources: [
					{
						sizes: '(max-width: 100px) 100vw, 100px',
						srcset: 'https://example.com/workspace1/assets/foo-id/images/100.webp 100w',
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 200, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 200, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/200.png',
				imageSources: [
					{
						sizes: '(max-width: 200px) 100vw, 200px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/120.webp 120w',
							'https://example.com/workspace1/assets/foo-id/images/200.webp 200w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 300, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 300, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/300.png',
				imageSources: [
					{
						sizes: '(max-width: 300px) 100vw, 300px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/140.webp 140w',
							'https://example.com/workspace1/assets/foo-id/images/220.webp 220w',
							'https://example.com/workspace1/assets/foo-id/images/300.webp 300w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 400, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 400, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/400.png',
				imageSources: [
					{
						sizes: '(max-width: 400px) 100vw, 400px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/80.webp 80w',
							'https://example.com/workspace1/assets/foo-id/images/160.webp 160w',
							'https://example.com/workspace1/assets/foo-id/images/240.webp 240w',
							'https://example.com/workspace1/assets/foo-id/images/320.webp 320w',
							'https://example.com/workspace1/assets/foo-id/images/400.webp 400w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 500, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 500, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/500.png',
				imageSources: [
					{
						sizes: '(max-width: 500px) 100vw, 500px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/100.webp 100w',
							'https://example.com/workspace1/assets/foo-id/images/180.webp 180w',
							'https://example.com/workspace1/assets/foo-id/images/260.webp 260w',
							'https://example.com/workspace1/assets/foo-id/images/340.webp 340w',
							'https://example.com/workspace1/assets/foo-id/images/420.webp 420w',
							'https://example.com/workspace1/assets/foo-id/images/500.webp 500w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 1000, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 1000, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/1000.png',
				imageSources: [
					{
						sizes: '(max-width: 1000px) 100vw, 1000px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/100.webp 100w',
							'https://example.com/workspace1/assets/foo-id/images/200.webp 200w',
							'https://example.com/workspace1/assets/foo-id/images/300.webp 300w',
							'https://example.com/workspace1/assets/foo-id/images/400.webp 400w',
							'https://example.com/workspace1/assets/foo-id/images/500.webp 500w',
							'https://example.com/workspace1/assets/foo-id/images/600.webp 600w',
							'https://example.com/workspace1/assets/foo-id/images/700.webp 700w',
							'https://example.com/workspace1/assets/foo-id/images/800.webp 800w',
							'https://example.com/workspace1/assets/foo-id/images/900.webp 900w',
							'https://example.com/workspace1/assets/foo-id/images/1000.webp 1000w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 2000, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 2000, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/2000.png',
				imageSources: [
					{
						sizes: '(max-width: 2000px) 100vw, 2000px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/200.webp 200w',
							'https://example.com/workspace1/assets/foo-id/images/400.webp 400w',
							'https://example.com/workspace1/assets/foo-id/images/600.webp 600w',
							'https://example.com/workspace1/assets/foo-id/images/800.webp 800w',
							'https://example.com/workspace1/assets/foo-id/images/1000.webp 1000w',
							'https://example.com/workspace1/assets/foo-id/images/1200.webp 1200w',
							'https://example.com/workspace1/assets/foo-id/images/1400.webp 1400w',
							'https://example.com/workspace1/assets/foo-id/images/1600.webp 1600w',
							'https://example.com/workspace1/assets/foo-id/images/1800.webp 1800w',
							'https://example.com/workspace1/assets/foo-id/images/2000.webp 2000w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 3000, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 3000, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/3000.png',
				imageSources: [
					{
						sizes: '(max-width: 3000px) 100vw, 3000px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/300.webp 300w',
							'https://example.com/workspace1/assets/foo-id/images/600.webp 600w',
							'https://example.com/workspace1/assets/foo-id/images/900.webp 900w',
							'https://example.com/workspace1/assets/foo-id/images/1200.webp 1200w',
							'https://example.com/workspace1/assets/foo-id/images/1500.webp 1500w',
							'https://example.com/workspace1/assets/foo-id/images/1800.webp 1800w',
							'https://example.com/workspace1/assets/foo-id/images/2100.webp 2100w',
							'https://example.com/workspace1/assets/foo-id/images/2400.webp 2400w',
							'https://example.com/workspace1/assets/foo-id/images/2700.webp 2700w',
							'https://example.com/workspace1/assets/foo-id/images/3000.webp 3000w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 4000, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 4000, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/4000.png',
				imageSources: [
					{
						sizes: '(max-width: 4000px) 100vw, 4000px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/400.webp 400w',
							'https://example.com/workspace1/assets/foo-id/images/800.webp 800w',
							'https://example.com/workspace1/assets/foo-id/images/1200.webp 1200w',
							'https://example.com/workspace1/assets/foo-id/images/1600.webp 1600w',
							'https://example.com/workspace1/assets/foo-id/images/2000.webp 2000w',
							'https://example.com/workspace1/assets/foo-id/images/2400.webp 2400w',
							'https://example.com/workspace1/assets/foo-id/images/2800.webp 2800w',
							'https://example.com/workspace1/assets/foo-id/images/3200.webp 3200w',
							'https://example.com/workspace1/assets/foo-id/images/3600.webp 3600w',
							'https://example.com/workspace1/assets/foo-id/images/4000.webp 4000w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 5000, extension: png', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 5000, extension: 'png' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/5000.png',
				imageSources: [
					{
						sizes: '(max-width: 5000px) 100vw, 5000px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/500.webp 500w',
							'https://example.com/workspace1/assets/foo-id/images/1000.webp 1000w',
							'https://example.com/workspace1/assets/foo-id/images/1500.webp 1500w',
							'https://example.com/workspace1/assets/foo-id/images/2000.webp 2000w',
							'https://example.com/workspace1/assets/foo-id/images/2500.webp 2500w',
							'https://example.com/workspace1/assets/foo-id/images/3000.webp 3000w',
							'https://example.com/workspace1/assets/foo-id/images/3500.webp 3500w',
							'https://example.com/workspace1/assets/foo-id/images/4000.webp 4000w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 200, extension: bmp', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 200, extension: 'bmp' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/200.jpeg',
				imageSources: [
					{
						sizes: '(max-width: 200px) 100vw, 200px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/120.webp 120w',
							'https://example.com/workspace1/assets/foo-id/images/200.webp 200w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 200, extension: tiff', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 200, extension: 'tiff' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/200.jpeg',
				imageSources: [
					{
						sizes: '(max-width: 200px) 100vw, 200px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/120.webp 120w',
							'https://example.com/workspace1/assets/foo-id/images/200.webp 200w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );

		it( 'should create responsive image source definition and image fallback URL - width: 200, extension: webp', () => {
			const data = { token, id: 'foo-id', origin: 'https://example.com/', width: 200, extension: 'webp' };
			expect( getImageUrls( data ) ).to.deep.equal( {
				imageFallbackUrl: 'https://example.com/workspace1/assets/foo-id/images/200.webp',
				imageSources: [
					{
						sizes: '(max-width: 200px) 100vw, 200px',
						srcset: [
							'https://example.com/workspace1/assets/foo-id/images/120.webp 120w',
							'https://example.com/workspace1/assets/foo-id/images/200.webp 200w'
						].join(),
						type: 'image/webp'
					}
				]
			} );
		} );
	} );
} );
