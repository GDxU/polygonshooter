class TileMapping {
    constructor(){
        this.names= {
            "grass": 0,
            "wall": 1,
            "tee": 2,
            "hole": 3,
            "sand": 4
        };
        this.indices = [
            "grass",
            "wall",
            "tee",
            "hole",
            "sand"
        ];
        this.stats={
            "grass": {},
            "wall": {"isBlocking":true},
            "tee": {},
            "hole": {"attractor":10},
            "sand": {}
        };
    }

    getStats (index){
        return this.stats[this.indices[index]];
    }
    getName(index) {
        return this.indices[index];
    }
}

module.exports = new TileMapping();