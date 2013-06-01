
module.exports = StringMap;

function StringMap(iterable) {
	this._map = {};
}
StringMap.prototype._key = function StringMap__key(key) {
	return "$$" + key;
};
StringMap.prototype.has = function StringMap_has(key) {
	return this._key(key) in this._map;
};
StringMap.prototype.set = function StringMap_set(key, value) {
	this._map[this._key(key)] = value;
};
StringMap.prototype.get = function StringMap_get(key) {
	return this._map[this._key(key)];
};
StringMap.prototype.delete = function StringMap_delete(key) {
	delete this._map[this._key(key)];
};
StringMap.prototype.items = function StringMap_items() {
	var self = this;
	return Object.keys(self._map).map(function (key) {
		return [key.slice(2), self._map[key]];
	});
};

