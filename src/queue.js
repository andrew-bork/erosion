

export default class Deque {
    constructor(){
        this.first = null;
        this.last = this.first;
        this.length = 0;
    }

    back() {
        if(this.length == 0) return null;
        return this.last.val;
    }

    front(){
        if(this.length == 0) return null;
        return this.first.val;
    }

    pushfront(dat){
        const n = {val: dat, next: this.first, prev: null};
        this.first.prev = n;
        this.first = n;
        if(this.length == 0){
            this.last = this.first;
        }
        this.length++;
    }

    pushback(dat){
        const n = {val: dat, next: null, prev: this.last}
        if(this.length == 0){
            this.first = this.last = n;
        }else{
            this.last.next = n;
            this.last = n;
        }
        this.length++;
    }

    empty(){
        return this.length == 0;
    }

    shift(){
        if(this.length == 0) return null;
        const n = this.first.val;
        this.first = this.first.next;
        this.length--;
        return n;
    }

    pop(){
        if(this.length == 0) return null;
        const n = this.last.val;
        this.last = this.last.prev;
        this.length--;
        return n;
    }
    
}