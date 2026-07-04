/// Maps 1:1 to the `properties` table in schema_saas_hosting.sql.
class Property {
  const Property({
    required this.id,
    required this.hostId,
    required this.name,
    required this.address,
    required this.city,
    required this.cin,
    required this.maxGuests,
    required this.timezone,
    required this.isActive,
    required this.createdAt,
  });

  final String id;
  final String hostId;
  final String name;
  final String address;
  final String city;
  final String? cin;
  final int maxGuests;
  final String timezone;
  final bool isActive;
  final DateTime createdAt;

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'] as String,
      hostId: json['host_id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      city: json['city'] as String,
      cin: json['cin'] as String?,
      maxGuests: json['max_guests'] as int,
      timezone: json['timezone'] as String? ?? 'Europe/Rome',
      isActive: json['is_active'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Property copyWith({
    String? name,
    String? address,
    String? city,
    String? cin,
    int? maxGuests,
    bool? isActive,
  }) {
    return Property(
      id: id,
      hostId: hostId,
      name: name ?? this.name,
      address: address ?? this.address,
      city: city ?? this.city,
      cin: cin ?? this.cin,
      maxGuests: maxGuests ?? this.maxGuests,
      timezone: timezone,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt,
    );
  }
}
