type Rng = [number, number];

declare type Request = {
    type: 'query',
    dims: {[domain: string] : {
        range: Rng,
        numBins: number
    }}
} | {
    type: 'range',
    dims: string[]
};

declare type Result = {
    type: 'query',
    data: {[dim: string]: number[]}
} | {
    type: 'range',
    ranges: {[dim: string]: Rng}
}
