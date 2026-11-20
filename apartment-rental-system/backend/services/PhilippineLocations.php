<?php
class PhilippineLocations {
  private static $cache = [];

  private static function rows($name) {
    if (!isset(self::$cache[$name])) {
      $path = BASE.'/data/psgc/'.$name.'.json';
      if (!is_file($path)) fail('Philippine location data is unavailable.', 503);
      $rows = json_decode(file_get_contents($path), true);
      if (!is_array($rows)) fail('Philippine location data could not be read.', 503);
      self::$cache[$name] = $rows;
    }
    return self::$cache[$name];
  }

  static function options($level, $parent) {
    if ($level === 'regions') return self::rows('regions');
    $noProvinceRegion = null;
    $noProvinceBranch = is_string($parent) && preg_match('/^no-province:(\d{9})$/', $parent, $matches);
    if ($noProvinceBranch) $noProvinceRegion = $matches[1];
    if (!$parent || (!$noProvinceBranch && !preg_match('/^\d{9}$/', $parent))) fail('Select a valid parent location.', 400);

    if ($level === 'provinces') {
      if ($noProvinceBranch) fail('Select a valid parent region.', 400);
      $region = self::find('regions', $parent);
      if (!$region) fail('Region not found.', 404);
      $provinces = array_values(array_filter(self::rows('provinces'), fn($row) => $row['regionCode'] === $parent));
      if ($provinces && self::hasProvinceLessCities($parent)) {
        $provinces[] = ['code' => 'no-province:'.$parent, 'name' => 'No province (special cities)'];
      }
      return $provinces;
    }
    if ($level === 'cities-municipalities') {
      if ($noProvinceBranch) {
        if (!self::find('regions', $noProvinceRegion) || !self::hasProvinceLessCities($noProvinceRegion)) fail('Province-less location group not found.', 404);
        return array_values(array_filter(self::rows('cities-municipalities'), fn($row) => $row['regionCode'] === $noProvinceRegion && $row['provinceCode'] === null));
      }
      $province = self::find('provinces', $parent);
      if ($province) return array_values(array_filter(self::rows('cities-municipalities'), fn($row) => $row['provinceCode'] === $parent));
      $region = self::find('regions', $parent);
      if ($region && !self::hasProvinces($parent)) {
        return array_values(array_filter(self::rows('cities-municipalities'), fn($row) => $row['regionCode'] === $parent && $row['provinceCode'] === null));
      }
      if ($region) fail('Select a province for this region.', 400);
      fail('Province or province-less region not found.', 404);
    }
    if ($level === 'barangays') {
      if (!self::find('cities-municipalities', $parent)) fail('City or municipality not found.', 404);
      return array_values(array_filter(self::rows('barangays'), fn($row) => $row['cityCode'] === $parent));
    }
    fail('Invalid location level.', 400);
  }

  private static function find($collection, $code) {
    foreach (self::rows($collection) as $row) {
      if ($row['code'] === $code) return $row;
    }
    return null;
  }

  private static function hasProvinces($regionCode) {
    foreach (self::rows('provinces') as $province) {
      if ($province['regionCode'] === $regionCode) return true;
    }
    return false;
  }

  private static function hasProvinceLessCities($regionCode) {
    foreach (self::rows('cities-municipalities') as $city) {
      if ($city['regionCode'] === $regionCode && $city['provinceCode'] === null) return true;
    }
    return false;
  }

  static function validateAddress($address) {
    if (!is_array($address)) fail('Select a region, province, city or municipality, and barangay.');
    foreach (['region_code', 'city_municipality_code', 'barangay_code'] as $field) {
      if (!isset($address[$field]) || !is_string($address[$field]) || !preg_match('/^\d{9}$/', $address[$field])) {
        fail('Select a region, province, city or municipality, and barangay.');
      }
    }
    $provinceCode = $address['province_code'] ?? '';
    $noProvinceBranch = is_string($provinceCode) && preg_match('/^no-province:(\d{9})$/', $provinceCode, $branchMatch);
    if (!is_string($provinceCode) || ($provinceCode !== '' && !$noProvinceBranch && !preg_match('/^\d{9}$/', $provinceCode))) {
      fail('Select a valid province.');
    }

    $region = self::find('regions', $address['region_code']);
    if (!$region) fail('Region not found.', 404);
    $provinceLess = !self::hasProvinces($region['code']);
    if ($provinceLess) {
      if ($provinceCode !== '' && (($noProvinceBranch && $branchMatch[1] !== $region['code']) || (!$noProvinceBranch && $provinceCode !== $region['code']))) fail('This region does not have a province.');
      $provinceCode = '';
    } elseif ($noProvinceBranch) {
      if ($branchMatch[1] !== $region['code'] || !self::hasProvinceLessCities($region['code'])) fail('This region does not have a province-less location group.');
      $provinceCode = '';
    } elseif ($provinceCode === '') {
      fail('Select a province for this region.');
    }
    $province = $provinceCode === '' ? null : self::find('provinces', $provinceCode);
    $city = self::find('cities-municipalities', $address['city_municipality_code']);
    $barangay = self::find('barangays', $address['barangay_code']);
    $provinceMatches = $provinceLess || $noProvinceBranch
      ? $provinceCode === ''
      : ($province && $province['regionCode'] === $address['region_code']);
    $cityMatches = $city && $city['regionCode'] === $address['region_code']
      && ($provinceLess || $noProvinceBranch ? $city['provinceCode'] === null : $city['provinceCode'] === $provinceCode);
    $barangayMatches = $barangay && $barangay['cityCode'] === $address['city_municipality_code']
      && $barangay['regionCode'] === $address['region_code'];
    if (!$region || !$provinceMatches || !$cityMatches || !$barangayMatches) {
      fail('The selected region, province, city or municipality, and barangay do not match.');
    }

    $streetValue = $address['street_address'] ?? '';
    if (!is_string($streetValue)) fail('Street, house number, or building name must be text.');
    $street = trim($streetValue);
    if (mb_strlen($street) > 180) fail('Street, house number, or building name must be 180 characters or fewer.');
    $segments = array_filter([
      $street,
      $barangay['name'],
      $city['name'],
      $province['name'] ?? null,
      $region['name']
    ], fn($value) => $value !== null && $value !== '');
    $completeAddress = implode(', ', $segments);
    if (mb_strlen($completeAddress) > 600) fail('The formatted address is too long.');

    return [
      'complete_address' => $completeAddress,
      'region_code' => $region['code'],
      'region_name' => $region['name'],
      'province_code' => $provinceCode !== '' ? $provinceCode : null,
      'province_name' => $province['name'] ?? null,
      'city_municipality_code' => $city['code'],
      'city_municipality_name' => $city['name'],
      'barangay_code' => $barangay['code'],
      'barangay_name' => $barangay['name'],
      'street_address' => $street !== '' ? $street : null
    ];
  }
}
