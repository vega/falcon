type Rng = [number, number];

declare type Request = {
    id: string,
    type: 'query',
    dims: {[domain: string]: {
        range: Rng,
        numBins: number
    }}
} | {
    id: string,
    type: 'range',
    dims: string[]
};

declare type Result = {
    id: string,
    type: 'query',
    data: {[dim: string]: number[]}
} | {
    type: 'range',
    id: string,
    ranges: {[dim: string]: Rng}
}
