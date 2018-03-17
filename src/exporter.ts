namespace pixi_spine {
    (PIXI as any).spine = pixi_spine;

    // texture patch for v5

    const TextureProto = PIXI.Texture.prototype as any;

    if (!TextureProto._updateUvs) {
        TextureProto._updateUvs = TextureProto.updateUvs;
    }
}
