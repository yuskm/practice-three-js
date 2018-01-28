var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var container;
var camera, scene;
var renderer;

//ymiya[ 2018/01/28
//いらない？
//var ctx;
//video]

// - video 用
var videoPlane;
var videoPlaneAngle = 0;

// - cube
var cubeMesh;

// - effect composer
var composer;

// - fireworks
var fireworks = [];

////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
    var Firework = function( scene )
    {
        this.scene    = scene;
        this.done     = false;
        this.dest     = [];
        this.colors   = [];
        this.geometry = null;
        this.points   = null;
        this.material = new THREE.PointsMaterial({
            size: 16,
            color: 0xffffff,
            opacity: 1,
            vertexColors: true,
            transparent: true,
            depthTest: false,
        });
        this.launch();
    };

    // prototype
    Firework.prototype = {
        constructor: Firework,

        // reset
        reset: function()
        {
            this.scene.remove( this.points );
            this.dest     = [];
            this.colors   = [];
            this.geometry = null;
            this.points   = null;
        },

        // launch
        launch: function()
        {
//ymiya[ 2018/01/28
// - てきとー
//          var s = Utils.screen();
            var s = { width:SCREEN_WIDTH, height:SCREEN_HEIGHT };
//ymiya]

            var x = THREE.Math.randInt( -s.width, s.width );
            var y = THREE.Math.randInt( 100, 800 );
            var z = THREE.Math.randInt( -1000, -3000 );

            var from = new THREE.Vector3( x, -800, z );
            var to   = new THREE.Vector3( x, y, z );

            var color = new THREE.Color();
            color.setHSL( THREE.Math.randFloat( 0.1, 0.9 ), 1, 0.9 );
            this.colors.push( color );

            this.geometry = new THREE.Geometry();
            this.points   = new THREE.Points( this.geometry, this.material );

            this.geometry.colors = this.colors;
            this.geometry.vertices.push( from );
            this.dest.push( to );
            this.colors.push( color );
            this.scene.add( this.points );
        },

        // explode
        explode: function( vector )
        {
            this.scene.remove( this.points );
            this.dest     = [];
            this.colors   = [];
            this.geometry = new THREE.Geometry();
            this.points   = new THREE.Points( this.geometry, this.material );

            for( var i = 0; i < 80; i++ )
            {
                var color = new THREE.Color();
                color.setHSL( THREE.Math.randFloat( 0.1, 0.9 ), 1, 0.5 );
                this.colors.push( color );

                var from = new THREE.Vector3(
                    THREE.Math.randInt( vector.x - 10, vector.x + 10 ),
                    THREE.Math.randInt( vector.y - 10, vector.y + 10 ),
                    THREE.Math.randInt( vector.z - 10, vector.z + 10 )
                );
                var to = new THREE.Vector3(
                    THREE.Math.randInt( vector.x - 1000, vector.x + 1000 ),
                    THREE.Math.randInt( vector.y - 1000, vector.y + 1000 ),
                    THREE.Math.randInt( vector.z - 1000, vector.z + 1000 )
                );
                this.geometry.vertices.push( from );
                this.dest.push( to );
            }
            this.geometry.colors = this.colors;
            this.scene.add( this.points );
        },

        // update
        update: function()
        {
            // only if objects exist
            if( this.points && this.geometry )
            {
                var total = this.geometry.vertices.length;

                // lerp particle positions
                for( var i = 0; i < total; i++ )
                {
                    this.geometry.vertices[i].x += ( this.dest[i].x - this.geometry.vertices[i].x ) / 20;
                    this.geometry.vertices[i].y += ( this.dest[i].y - this.geometry.vertices[i].y ) / 20;
                    this.geometry.vertices[i].z += ( this.dest[i].z - this.geometry.vertices[i].z ) / 20;
                    this.geometry.verticesNeedUpdate = true;
                }
                // watch first particle for explosion
                if( total === 1 )
                {
                    if( Math.ceil( this.geometry.vertices[0].y ) > ( this.dest[0].y - 20 ) )
                    {
                        this.explode( this.geometry.vertices[0] );
                        return;
                    }
                }
                // fade out exploded particles
                if( total > 1 )
                {
                    this.material.opacity -= 0.015;
                    this.material.colorsNeedUpdate = true;
                }
                // remove, reset and stop animating
                if( this.material.opacity <= 0 )
                {
                    this.reset();
                    this.done = true;
                    return;
                }
            }
        },
    };


////////////////////////////////////////////////////////////////////////////////

init();
animate();

////////////////////////////////////////////////////////////////////////////////

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000);
    camera.position.z = 200;

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container.appendChild(renderer.domElement);

    // video要素とそれをキャプチャするcanvas要素を生成
    var video = document.createElement('video');
    video.src = 'assets/video/samplevideo.mp4';
    video.load();
    video.play();

	// ビデオエレメントのリピート再生を設定
	video.addEventListener('ended', function(){
		video.play();
	}, true);


//ymiya[ 2018/01/28
//いらない？
//    var canvas = document.createElement('canvas');
//    canvas.width = 320;
//    canvas.height = 240;
//    ctx = canvas.getContext('2d');
//    ctx.fillStyle = '#000000';
//    ctx.fillRect(0, 0, canvas.width, canvas.height);
//
//    // 生成したcanvasをtextureとしてTHREE.Textureオブジェクトを生成
//    texture = new THREE.Texture(canvas);
//ymiya]

    // - video texture
    var videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // - texture として video を rendering する plane
    var geometry = new THREE.PlaneGeometry(400, 400);
    var material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        map: videoTexture
    });
    videoPlane = new THREE.Mesh(geometry, material);
    scene.add(videoPlane);
    videoPlane.position.x = 0;
    videoPlane.position.y = 0;
    videoPlane.position.z = 0;

     // - cube 表示
     // - light
     var directionalLight = new THREE.DirectionalLight( 0xffffff );
     directionalLight.position.set( 0, 0.7, 0.7 );
     scene.add( directionalLight );
     // - cube material
    var cubeMaterial = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
    var cubeGeometry = new THREE.CubeGeometry( 30, 30, 30 );
    cubeMesh = new THREE.Mesh( cubeGeometry, cubeMaterial );
    scene.add( cubeMesh );

//ymiya[ 2018/01/27
// - effect composer
    composer = new THREE.EffectComposer( renderer );
    composer.addPass( new THREE.RenderPass( scene, camera ) );

    // THREE.RenderPassでシーンを描画
    composer.addPass( new THREE.RenderPass( scene, camera ) );
    // ぼかしフィルタ追加
    composer.addPass( new THREE.BloomPass(1.0, 25, 2.0, 256) );
    // フィルムフィルタ追加
    composer.addPass( new THREE.FilmPass(0.1, 2.0, 5.0, 512) );

    // フィルタの結果を表示画面にレンダリング
    var toScreen = new THREE.ShaderPass( THREE.CopyShader );
    toScreen.renderToScreen = true;
    composer.addPass( toScreen );
//ymiya]

}

////////////////////////////////////////////////////////////////////////////////
function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
}

////////////////////////////////////////////////////////////////////////////////
function animate() {
    requestAnimationFrame(animate);

//ymiya[ 2018/01/28
    // add fireworks
    if ( THREE.Math.randInt( 1, 20 ) === 10 ) {
        fireworks.push( new Firework( scene ) );
    }
    // update fireworks
    for ( var i = 0; i < fireworks.length; i++ ) {
        if ( fireworks[ i ].done ) {
            fireworks.splice( i, 1 );
            continue;
        }
        fireworks[ i ].update();
    }
//ymiya]
    render();
}

////////////////////////////////////////////////////////////////////////////////
function render() {
//ymiya[ 2018/01/28
//いらない？
//    if (video.readyState === video.HAVE_ENOUGH_DATA) {
//        ctx.drawImage(video, 0, 0);
//        if (texture) {
//            texture.needsUpdate = true;
//        }
//    }
//ymiya]

    // video を写した  plane を rotate
//    videoPlane.rotation.x += Math.PI / 180;
//    videoPlane.rotation.y += Math.PI / 180;
//    videoPlane.rotation.z += Math.PI / 180;

    // video を写した  plane を quaternion
    var axis = new THREE.Vector3(1,1,1).normalize();
    videoPlaneAngle += Math.PI / 180;
    var q = new THREE.Quaternion();
    q.setFromAxisAngle(axis,videoPlaneAngle);
    videoPlane.quaternion.copy(q);

    // cube を roatation
    cubeMesh.rotation.set(
        0,
        cubeMesh.rotation.y + .01,
        cubeMesh.rotation.z + .01
    );

//ymiya[ 2018/01/28
    // effect composer 経由でrender
//     composer.render();   // effect composer
/**/   renderer.render(scene, camera); // direct
//ymiya]
}
